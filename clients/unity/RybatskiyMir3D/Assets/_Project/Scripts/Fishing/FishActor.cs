using UnityEngine;
using RybatskiyMir.World;

namespace RybatskiyMir.Fishing
{
    /// <summary>
    /// Perch for the slice. Visible during FIGHT / LAND only.
    /// Presentation: director feeds world target from server tension/progress.
    /// </summary>
    public class FishActor : MonoBehaviour
    {
        Transform _tail;
        Transform _fin;
        Vector3 _prev;
        float _burst;

        public static GameObject Build()
        {
            var bodyM = MeshUtil.Lit(new Color(0.42f, 0.50f, 0.28f), 0.38f);
            var darkM = MeshUtil.Lit(new Color(0.18f, 0.20f, 0.14f), 0.3f);
            var finM = MeshUtil.Lit(new Color(0.55f, 0.42f, 0.22f), 0.25f);
            var bellyM = MeshUtil.Lit(new Color(0.78f, 0.72f, 0.52f), 0.4f);
            var eyeM = MeshUtil.Lit(new Color(0.08f, 0.08f, 0.06f), 0.2f);

            var root = new GameObject("Perch");
            var actor = root.AddComponent<FishActor>();

            MeshUtil.BallChild("Body", root.transform, Vector3.zero, new Vector3(0.09f, 0.07f, 0.20f), bodyM, 14);
            MeshUtil.BallChild("Belly", root.transform, new Vector3(0, -0.025f, 0.02f), new Vector3(0.07f, 0.04f, 0.14f), bellyM, 10);
            MeshUtil.BallChild("Head", root.transform, new Vector3(0, 0.01f, 0.16f), new Vector3(0.06f, 0.055f, 0.07f), bodyM, 12);
            MeshUtil.BallChild("EyeL", root.transform, new Vector3(-0.04f, 0.025f, 0.20f), Vector3.one * 0.012f, eyeM, 8);
            MeshUtil.BallChild("EyeR", root.transform, new Vector3(0.04f, 0.025f, 0.20f), Vector3.one * 0.012f, eyeM, 8);

            actor._tail = new GameObject("Tail").transform;
            actor._tail.SetParent(root.transform, false);
            actor._tail.localPosition = new Vector3(0, 0, -0.18f);
            MeshUtil.BallChild("TailFin", actor._tail, new Vector3(0, 0, -0.05f), new Vector3(0.012f, 0.07f, 0.07f), finM, 10);

            actor._fin = MeshUtil.BallChild("Dorsal", root.transform, new Vector3(0, 0.07f, 0.02f), new Vector3(0.008f, 0.055f, 0.09f), darkM, 8);
            MeshUtil.BallChild("StripeA", root.transform, new Vector3(0, 0.01f, 0.04f), new Vector3(0.092f, 0.03f, 0.025f), darkM, 8);
            MeshUtil.BallChild("StripeB", root.transform, new Vector3(0, 0.01f, -0.06f), new Vector3(0.085f, 0.028f, 0.022f), darkM, 8);
            MeshUtil.BallChild("PecL", root.transform, new Vector3(-0.06f, -0.01f, 0.08f), new Vector3(0.05f, 0.008f, 0.03f), finM, 8);
            MeshUtil.BallChild("PecR", root.transform, new Vector3(0.06f, -0.01f, 0.08f), new Vector3(0.05f, 0.008f, 0.03f), finM, 8);

            root.SetActive(false);
            return root;
        }

        void Update()
        {
            var dt = Mathf.Max(Time.deltaTime, 0.0001f);
            var v = (transform.position - _prev) / dt;
            _prev = transform.position;
            if (v.sqrMagnitude > 0.04f)
            {
                var look = Quaternion.LookRotation(v.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, 1f - Mathf.Exp(-8f * dt));
                if (v.magnitude > 2.4f) _burst = 1f;
            }
            _burst = Mathf.MoveTowards(_burst, 0f, dt * 1.8f);
            var wag = 16f + _burst * 22f;
            if (_tail) _tail.localRotation = Quaternion.Euler(0, Mathf.Sin(Time.time * wag) * (18f + _burst * 14f), 0);
            if (_fin) _fin.localRotation = Quaternion.Euler(0, 0, Mathf.Sin(Time.time * 9f) * 8f);
        }
    }
}
