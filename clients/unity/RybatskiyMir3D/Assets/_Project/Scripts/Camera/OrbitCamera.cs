using RybatskiyMir.Input;
using UnityEngine;

namespace RybatskiyMir.Cam
{
    /// <summary>
    /// Explore: orbit around the fisherman.
    /// Fishing: over-shoulder, high, off-axis. Water and cast zone fill the frame.
    /// Blends with SmoothDamp — no snap.
    /// </summary>
    public class OrbitCamera : MonoBehaviour
    {
        public Transform Target;
        public Transform FishingLook;
        public PlayerInputReader Input;
        public float Distance = 4.8f;
        public float Height = 1.62f;
        public float MinDistance = 2.6f;
        public float MaxDistance = 8.2f;
        public float MinPitch = -22f;
        public float MaxPitch = 58f;
        public float CollisionRadius = 0.22f;
        public LayerMask CollisionMask = ~0;
        public bool FishingFraming;
        public Camera Cam;

        // Over-right-shoulder fishing shot. Character stays ~20% of frame.
        public float FishBack = 6.2f;
        public float FishHeight = 2.55f;
        public float FishSide = 2.35f;
        public float FishLookAhead = 11.5f;
        public float FishLookHeight = 0.25f;
        public float FishFov = 58f;
        public float ExploreFov = 56f;
        public float BlendTime = 0.55f;

        float _yaw;
        float _pitch = 16f;
        float _fishing;
        float _fishingVel;
        Vector3 _posVel;
        Vector3 _lookVel;
        Vector3 _lookPoint;
        float _fovVel;
        bool _lookInit;

        public void SnapBehind()
        {
            if (!Target) return;
            _yaw = Target.eulerAngles.y;
            _pitch = 14f;
        }

        public void EnterFishing()
        {
            FishingFraming = true;
        }

        public void ExitFishing()
        {
            FishingFraming = false;
            if (Target) _yaw = Target.eulerAngles.y;
        }

        void LateUpdate()
        {
            if (!Target || Input == null) return;

            _fishing = Mathf.SmoothDamp(_fishing, FishingFraming ? 1f : 0f, ref _fishingVel, BlendTime);

            if (!FishingFraming)
            {
                if (Mathf.Abs(Input.ZoomDelta) > 0.01f)
                    Distance = Mathf.Clamp(Distance - Input.ZoomDelta * 0.85f, MinDistance, MaxDistance);
                _yaw += Input.Look.x;
                _pitch = Mathf.Clamp(_pitch - Input.Look.y, MinPitch, MaxPitch);
            }

            ExplorePose(out var explorePos, out var exploreLook);
            FishingPose(out var fishPos, out var fishLook);

            var desired = Vector3.Lerp(explorePos, fishPos, _fishing);
            var lookTarget = Vector3.Lerp(exploreLook, fishLook, _fishing);

            var colStart = Target.position + Vector3.up * Mathf.Lerp(Height, 1.7f, _fishing);
            var dir = desired - colStart;
            var mag = dir.magnitude;
            var radius = Mathf.Lerp(CollisionRadius, 0.14f, _fishing);
            if (mag > 0.05f && Physics.SphereCast(colStart, radius, dir.normalized, out var hit, mag, CollisionMask, QueryTriggerInteraction.Ignore))
                desired = hit.point + hit.normal * (radius + 0.05f);

            var posSmooth = Mathf.Lerp(0.08f, BlendTime, _fishing);
            transform.position = Vector3.SmoothDamp(transform.position, desired, ref _posVel, posSmooth);

            if (!_lookInit)
            {
                _lookPoint = lookTarget;
                _lookInit = true;
            }
            _lookPoint = Vector3.SmoothDamp(_lookPoint, lookTarget, ref _lookVel, Mathf.Lerp(0.07f, BlendTime, _fishing));
            var lookRot = Quaternion.LookRotation(_lookPoint - transform.position, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, lookRot, 1f - Mathf.Exp(-9f * Time.deltaTime));

            if (!Cam) Cam = GetComponent<Camera>();
            if (Cam)
            {
                var fov = Mathf.Lerp(ExploreFov, FishFov, _fishing);
                Cam.fieldOfView = Mathf.SmoothDamp(Cam.fieldOfView, fov, ref _fovVel, BlendTime);
            }
        }

        void ExplorePose(out Vector3 pos, out Vector3 look)
        {
            var rot = Quaternion.Euler(_pitch, _yaw, 0);
            look = Target.position + Vector3.up * Height;
            pos = look - rot * Vector3.forward * Distance;
        }

        void FishingPose(out Vector3 pos, out Vector3 look)
        {
            var origin = Target.position;
            var fwd = Target.forward;
            var right = Target.right;
            // Right-shoulder, raised, not glued to the back.
            pos = origin - fwd * FishBack + right * FishSide + Vector3.up * FishHeight;
            if (FishingLook)
                look = FishingLook.position;
            else
                look = origin + fwd * FishLookAhead + Vector3.up * FishLookHeight;
        }
    }
}
