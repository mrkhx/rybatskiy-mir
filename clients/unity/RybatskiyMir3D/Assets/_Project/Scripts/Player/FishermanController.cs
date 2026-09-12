using RybatskiyMir.Input;
using UnityEngine;

namespace RybatskiyMir.Player
{
    [RequireComponent(typeof(CharacterController))]
    public class FishermanController : MonoBehaviour
    {
        public float WalkSpeed = 3.2f;
        public float RunSpeed = 5.6f;
        public float RotateSpeed = 12f;
        public float Gravity = -22f;
        public Transform CameraPivot;
        public PlayerInputReader Input;
        public bool Locked;
        public FishermanBody Body;

        CharacterController _cc;
        float _vy;
        public Vector3 PlanarVelocity { get; private set; }
        public float Speed => PlanarVelocity.magnitude;

        void Awake() => _cc = GetComponent<CharacterController>();

        void Update()
        {
            if (Body)
            {
                if (!Locked)
                    Body.Pose = Speed > 4.2f ? FishermanPose.Run : Speed > 0.2f ? FishermanPose.Walk : FishermanPose.Idle;
                Body.MoveSpeed = Speed;
            }

            if (Locked)
            {
                PlanarVelocity = Vector3.zero;
                _vy += Gravity * Time.deltaTime;
                _cc.Move(new Vector3(0, _vy, 0) * Time.deltaTime);
                return;
            }

            var camFwd = CameraPivot ? Vector3.ProjectOnPlane(CameraPivot.forward, Vector3.up).normalized : transform.forward;
            var camRight = CameraPivot ? Vector3.ProjectOnPlane(CameraPivot.right, Vector3.up).normalized : transform.right;
            // On-foot strafe: A = -right (left on screen), D = +right. Not vehicle yaw.
            var wish = camFwd * Input.Move.y + camRight * Input.Move.x;
            if (wish.sqrMagnitude > 1) wish.Normalize();
            var speed = Input.Sprint ? RunSpeed : WalkSpeed;
            PlanarVelocity = wish * speed;

            if (wish.sqrMagnitude > 0.05f)
            {
                var look = Quaternion.LookRotation(wish, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, RotateSpeed * Time.deltaTime);
            }

            if (_cc.isGrounded && _vy < 0) _vy = -2f;
            _vy += Gravity * Time.deltaTime;
            _cc.Move((PlanarVelocity + Vector3.up * _vy) * Time.deltaTime);
        }

        public void Teleport(Vector3 pos, Quaternion rot)
        {
            _cc.enabled = false;
            transform.SetPositionAndRotation(pos, rot);
            _cc.enabled = true;
        }
    }
}
