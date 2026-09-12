using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace RybatskiyMir.Input
{
    /// <summary>
    /// Action-based input. Keyboard + mouse + gamepad.
    /// Touch overlay later writes the same Move/Look/Interact fields.
    /// On-foot: A strafe left, D strafe right (not vehicle steer).
    /// </summary>
    public class PlayerInputReader : MonoBehaviour
    {
        public Vector2 Move { get; private set; }
        public Vector2 Look { get; private set; }
        public bool Sprint { get; private set; }
        public bool InteractPressed { get; private set; }
        public bool CastPressed { get; private set; }
        public bool CancelPressed { get; private set; }
        public float ReelAxis { get; private set; }
        public float LookSensitivity = 0.12f;

        Vector2 _touchMove;
        bool _touchOverride;

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

        void Update()
        {
            InteractPressed = false;
            CastPressed = false;
            CancelPressed = false;
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
                if (kb.spaceKey.wasPressedThisFrame) CastPressed = true;
                if (kb.escapeKey.wasPressedThisFrame || kb.rKey.wasPressedThisFrame) CancelPressed = true;
            }
            if (pad != null)
            {
                move += pad.leftStick.ReadValue();
                look += pad.rightStick.ReadValue() * 2.4f;
                Sprint = Sprint || pad.leftShoulder.isPressed;
                if (pad.buttonSouth.wasPressedThisFrame) { InteractPressed = true; CastPressed = true; }
                if (pad.buttonEast.wasPressedThisFrame) CancelPressed = true;
                ReelAxis = pad.rightTrigger.ReadValue();
            }
            if (mouse != null)
            {
                var d = mouse.delta.ReadValue();
                look += new Vector2(d.x * LookSensitivity, d.y * LookSensitivity);
                if (mouse.leftButton.wasPressedThisFrame) CastPressed = true;
            }
#else
            move = new Vector2(UnityEngine.Input.GetAxisRaw("Horizontal"), UnityEngine.Input.GetAxisRaw("Vertical"));
            look = new Vector2(UnityEngine.Input.GetAxis("Mouse X"), UnityEngine.Input.GetAxis("Mouse Y"));
            Sprint = UnityEngine.Input.GetKey(KeyCode.LeftShift);
            InteractPressed = UnityEngine.Input.GetKeyDown(KeyCode.E);
            CastPressed = UnityEngine.Input.GetKeyDown(KeyCode.Space) || UnityEngine.Input.GetMouseButtonDown(0);
            CancelPressed = UnityEngine.Input.GetKeyDown(KeyCode.Escape);
#endif
            if (_touchOverride) move = _touchMove;
            Move = Vector2.ClampMagnitude(move, 1);
            Look = look;
        }
    }
}
