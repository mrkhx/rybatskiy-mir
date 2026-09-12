using RybatskiyMir.Input;
using UnityEngine;

namespace RybatskiyMir.Cam
{
    public class OrbitCamera : MonoBehaviour
    {
        public Transform Target;
        public PlayerInputReader Input;
        public float Distance = 4.8f;
        public float Height = 1.58f;
        public float MinPitch = -18f;
        public float MaxPitch = 52f;
        public float FishingDistance = 3.3f;
        public float CollisionRadius = 0.18f;
        public LayerMask CollisionMask = ~0;
        public bool FishingFraming;

        float _yaw;
        float _pitch = 14f;

        public void SnapBehind()
        {
            if (!Target) return;
            _yaw = Target.eulerAngles.y;
            _pitch = 16f;
        }

        void LateUpdate()
        {
            if (!Target || Input == null) return;
            _yaw += Input.Look.x;
            _pitch = Mathf.Clamp(_pitch - Input.Look.y, MinPitch, MaxPitch);

            var dist = FishingFraming ? FishingDistance : Distance;
            var rot = Quaternion.Euler(_pitch, _yaw, 0);
            var pivot = Target.position + Vector3.up * (FishingFraming ? 1.35f : Height);
            var desired = pivot - rot * Vector3.forward * dist;
            var dir = desired - pivot;
            var mag = dir.magnitude;
            if (mag > 0.001f && Physics.SphereCast(pivot, CollisionRadius, dir.normalized, out var hit, mag, CollisionMask, QueryTriggerInteraction.Ignore))
                desired = hit.point + hit.normal * CollisionRadius;
            var k = 1f - Mathf.Exp(-10f * Time.deltaTime);
            transform.position = Vector3.Lerp(transform.position, desired, k);
            var look = Quaternion.LookRotation(pivot - transform.position, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, look, 1f - Mathf.Exp(-12f * Time.deltaTime));
        }
    }
}
