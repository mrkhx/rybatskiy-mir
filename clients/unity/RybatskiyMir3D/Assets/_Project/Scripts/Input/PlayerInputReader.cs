using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace RybatskiyMir.Input
{
    /// <summary>
    /// Action-based input. Keyboard + mouse + gamepad.
    /// On-foot: A strafe left, D strafe right (not vehicle steer).
    /// Space = jump when roaming, cast when fishing (director reads JumpPressed too).
    /// </summary>
    public class PlayerInputReader : MonoBehaviour
    {
        public Vector2 Move { get; private set; }
        public Vector2 Look { get; private set; }
        public bool Sprint { get; private set; }
        public bool InteractPressed { get; private set; }
        public bool CastPressed { get; private set; }
        public bool JumpPressed { get; private set; }
        public bool CancelPressed { get; private set; }
        public float ReelAxis { get; private set; }
        public float ZoomDelta { get; private set; }
        public bool PointerLocked { get; private set; } = true;
        public float LookSensitivity = 0.12f;

        Vector2 _touchMove;
        bool _touchOverride;
        bool _consumeClick;

        public void SetTouchMove(Vector2 move)
        {
            _touchMove = Vector2.ClampMagnitude(move, 1f);
            _touchOverride = true;
        }

        public void ClearTouch()
        {
            _touchOverride = false;
            _touchMove = Vector2.zero;
        }

        public void SetPointerLocked(bool locked)
        {
            PointerLocked = locked;
            Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !locked;
        }

        void Start() => SetPointerLocked(true);

        void Update()
        {
            InteractPressed = false;
            CastPressed = false;
            JumpPressed = false;
            CancelPressed = false;
            ZoomDelta = 0;
            var move = Vector2.zero;
            var look = Vector2.zero;
            Sprint = false;
            ReelAxis = 0;

#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            var mouse = Mouse.current;
            var pad = Gamepad.current;

            if (kb != null)
            {
                if (kb.wKey.isPressed || kb.upArrowKey.isPressed) move.y += 1;
                if (kb.sKey.isPressed || kb.downArrowKey.isPressed) move.y -= 1;
                if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) move.x -= 1;
                if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) move.x += 1;
                Sprint = kb.leftShiftKey.isPressed;
                if (kb.eKey.wasPressedThisFrame) InteractPressed = true;
                if (kb.spaceKey.wasPressedThisFrame) JumpPressed = true;
                if (kb.rKey.wasPressedThisFrame) CancelPressed = true;
                if (kb.escapeKey.wasPressedThisFrame)
                {
                    if (PointerLocked) SetPointerLocked(false);
                    else CancelPressed = true;
                }
            }
            if (pad != null)
            {
                move += pad.leftStick.ReadValue();
                look += pad.rightStick.ReadValue() * 2.4f;
                Sprint = Sprint || pad.leftShoulder.isPressed;
                if (pad.buttonWest.wasPressedThisFrame) InteractPressed = true;
                if (pad.buttonSouth.wasPressedThisFrame) { JumpPressed = true; CastPressed = true; }
                if (pad.buttonEast.wasPressedThisFrame) CancelPressed = true;
                ReelAxis = pad.rightTrigger.ReadValue();
            }
            if (mouse != null)
            {
                if (!PointerLocked && mouse.leftButton.wasPressedThisFrame)
                {
                    SetPointerLocked(true);
                    _consumeClick = true;
                }
                else if (PointerLocked && mouse.leftButton.wasPressedThisFrame && !_consumeClick)
                    CastPressed = true;
                _consumeClick = false;

                if (PointerLocked)
                {
                    var d = mouse.delta.ReadValue();
                    look += new Vector2(d.x * LookSensitivity, d.y * LookSensitivity);
                }
                ZoomDelta = mouse.scroll.ReadValue().y / 120f;
            }
#else
            move = new Vector2(UnityEngine.Input.GetAxisRaw("Horizontal"), UnityEngine.Input.GetAxisRaw("Vertical"));
            look = new Vector2(UnityEngine.Input.GetAxis("Mouse X"), UnityEngine.Input.GetAxis("Mouse Y"));
            Sprint = UnityEngine.Input.GetKey(KeyCode.LeftShift);
            InteractPressed = UnityEngine.Input.GetKeyDown(KeyCode.E);
            JumpPressed = UnityEngine.Input.GetKeyDown(KeyCode.Space);
            CastPressed = UnityEngine.Input.GetMouseButtonDown(0);
            CancelPressed = UnityEngine.Input.GetKeyDown(KeyCode.R);
            if (UnityEngine.Input.GetKeyDown(KeyCode.Escape))
            {
                if (PointerLocked) SetPointerLocked(false);
                else CancelPressed = true;
            }
            ZoomDelta = UnityEngine.Input.GetAxis("Mouse ScrollWheel") * 10f;
#endif
            if (_touchOverride) move = _touchMove;
            Move = Vector2.ClampMagnitude(move, 1);
            Look = look;
        }
    }
}
