using RybatskiyMir.Input;
using UnityEngine;

namespace RybatskiyMir.Cam
{
    public class OrbitCamera : MonoBehaviour
    {
        public Transform Target;
        public PlayerInputReader Input;
        public float Distance = 4.6f;
        public float Height = 1.55f;
        public float MinDistance = 2.4f;
        public float MaxDistance = 8.0f;
        public float MinPitch = -22f;
        public float MaxPitch = 58f;
        public float FishingDistance = 3.05f;
        public float FishingHeight = 1.28f;
        public float CollisionRadius = 0.22f;
        public LayerMask CollisionMask = ~0;
        public bool FishingFraming;
        public Camera Cam;

        float _yaw;
        float _pitch = 16f;
        float _fishing;
        Vector3 _posVel;
        float _fovVel;

        public void SnapBehind()
        {
            if (!Target) return;
            _yaw = Target.eulerAngles.y;
            _pitch = 14f;
        }

        void LateUpdate()
        {
            if (!Target || Input == null) return;

            if (Mathf.Abs(Input.ZoomDelta) > 0.01f && !FishingFraming)
                Distance = Mathf.Clamp(Distance - Input.ZoomDelta * 0.85f, MinDistance, MaxDistance);

            _yaw += Input.Look.x;
            _pitch = Mathf.Clamp(_pitch - Input.Look.y, MinPitch, MaxPitch);

            _fishing = Mathf.MoveTowards(_fishing, FishingFraming ? 1f : 0f, Time.deltaTime * 2.4f);

            var dist = Mathf.Lerp(Distance, FishingDistance, _fishing);
            var height = Mathf.Lerp(Height, FishingHeight, _fishing);
            var rot = Quaternion.Euler(_pitch, _yaw, 0);
            var pivot = Target.position + Vector3.up * height;
            if (_fishing > 0.01f)
                pivot += Target.forward * (1.55f * _fishing);

            var desired = pivot - rot * Vector3.forward * dist;
            var dir = desired - pivot;
            var mag = dir.magnitude;
            if (mag > 0.001f && Physics.SphereCast(pivot, CollisionRadius, dir.normalized, out var hit, mag, CollisionMask, QueryTriggerInteraction.Ignore))
                desired = hit.point + hit.normal * (CollisionRadius + 0.04f);

            transform.position = Vector3.SmoothDamp(transform.position, desired, ref _posVel, 0.07f);
            var lookPt = pivot + Vector3.up * 0.08f;
            var look = Quaternion.LookRotation(lookPt - transform.position, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, look, 1f - Mathf.Exp(-14f * Time.deltaTime));

            if (!Cam) Cam = GetComponent<Camera>();
            if (Cam)
            {
                var fov = Mathf.Lerp(56f, 50f, _fishing);
                Cam.fieldOfView = Mathf.SmoothDamp(Cam.fieldOfView, fov, ref _fovVel, 0.18f);
            }
        }
    }
}
