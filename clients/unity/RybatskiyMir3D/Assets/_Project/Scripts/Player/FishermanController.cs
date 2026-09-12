using RybatskiyMir.Audio;
using RybatskiyMir.Input;
using UnityEngine;

namespace RybatskiyMir.Player
{
    [RequireComponent(typeof(CharacterController))]
    public class FishermanController : MonoBehaviour
    {
        public float WalkSpeed = 3.15f;
        public float RunSpeed = 5.45f;
        public float Accel = 14f;
        public float Decel = 18f;
        public float AirControl = 0.32f;
        public float RotateSpeed = 11f;
        public float Gravity = -26f;
        public float JumpVelocity = 6.35f;
        public float CoyoteTime = 0.12f;
        public float JumpBuffer = 0.12f;
        public Transform CameraPivot;
        public PlayerInputReader Input;
        public bool Locked;
        public FishermanBody Body;

        CharacterController _cc;
        float _vy;
        float _coyote;
        float _buffer;
        float _stepAcc;
        public Vector3 PlanarVelocity { get; private set; }
        public float Speed => PlanarVelocity.magnitude;
        public bool Grounded { get; private set; }

        void Awake()
        {
            _cc = GetComponent<CharacterController>();
            _cc.slopeLimit = 48f;
            _cc.stepOffset = 0.32f;
            _cc.skinWidth = 0.08f;
            _cc.minMoveDistance = 0f;
            _cc.radius = 0.28f;
            _cc.height = 1.78f;
            _cc.center = new Vector3(0, 0.9f, 0);
        }

        void Update()
        {
            var dt = Time.deltaTime;
            Grounded = _cc.isGrounded;
            if (Grounded) _coyote = CoyoteTime;
            else _coyote -= dt;

            if (Input != null && Input.JumpPressed) _buffer = JumpBuffer;
            else _buffer -= dt;

            if (Body)
            {
                if (!Locked)
                {
                    if (!Grounded && _vy > 0.4f) Body.Pose = FishermanPose.Idle;
                    else Body.Pose = Speed > 4.15f ? FishermanPose.Run : Speed > 0.18f ? FishermanPose.Walk : FishermanPose.Idle;
                }
                Body.MoveSpeed = Speed;
            }

            if (Locked)
            {
                PlanarVelocity = Vector3.zero;
                _vy += Gravity * dt;
                _cc.Move(new Vector3(0, _vy, 0) * dt);
                _buffer = 0;
                return;
            }

            var camFwd = CameraPivot
                ? Vector3.ProjectOnPlane(CameraPivot.forward, Vector3.up).normalized
                : transform.forward;
            var camRight = CameraPivot
                ? Vector3.ProjectOnPlane(CameraPivot.right, Vector3.up).normalized
                : transform.right;
            if (camFwd.sqrMagnitude < 0.001f) camFwd = transform.forward;

            var wish = camFwd * Input.Move.y + camRight * Input.Move.x;
            if (wish.sqrMagnitude > 1f) wish.Normalize();
            var speed = Input.Sprint ? RunSpeed : WalkSpeed;
            var desired = wish * speed;
            var a = wish.sqrMagnitude > 0.02f ? Accel : Decel;
            if (!Grounded) a *= AirControl;
            PlanarVelocity = Vector3.MoveTowards(PlanarVelocity, desired, a * dt);

            if (wish.sqrMagnitude > 0.04f)
            {
                var look = Quaternion.LookRotation(wish, Vector3.up);
                var turn = Grounded ? RotateSpeed : RotateSpeed * 0.45f;
                transform.rotation = Quaternion.Slerp(transform.rotation, look, turn * dt);
            }

            if (Grounded && _vy < 0f) _vy = -2.2f;
            var canJump = _coyote > 0f && _buffer > 0f && _vy <= 0.6f;
            if (canJump)
            {
                _vy = JumpVelocity;
                _coyote = 0f;
                _buffer = 0f;
                Grounded = false;
            }
            _vy += Gravity * dt;
            var flags = _cc.Move((PlanarVelocity + Vector3.up * _vy) * dt);
            if ((flags & CollisionFlags.Above) != 0 && _vy > 0f) _vy = 0f;
            if (Grounded && Speed > 0.45f)
            {
                _stepAcc += Speed * dt;
                var stride = Input != null && Input.Sprint ? 0.38f : 0.48f;
                if (_stepAcc >= stride)
                {
                    _stepAcc = 0f;
                    var p = transform.position;
                    WorldAudio.I?.PlayStep(p);
                    if (Mathf.Abs(p.x) < 1.15f && p.z > -1.4f && p.z < 8.2f)
                        WorldAudio.I?.PlayCreak(p);
                }
            }
            else _stepAcc = 0f;
        }

        public void Teleport(Vector3 pos, Quaternion rot)
        {
            _cc.enabled = false;
            transform.SetPositionAndRotation(pos, rot);
            _cc.enabled = true;
            PlanarVelocity = Vector3.zero;
            _vy = 0f;
        }
    }
}
