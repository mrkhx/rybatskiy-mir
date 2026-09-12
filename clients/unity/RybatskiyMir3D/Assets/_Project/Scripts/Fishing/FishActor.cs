using UnityEngine;
using RybatskiyMir.World;

namespace RybatskiyMir.Fishing
{
    /// <summary>
    /// One perch-like fish for the slice. Visible during FIGHT / LAND only.
    /// Motion is presentation: director feeds a target from server tension/progress.
    /// </summary>
    public class FishActor : MonoBehaviour
    {
        Transform _tail;
        Vector3 _prev;

        public static GameObject Build()
        {
            var bodyM = MeshUtil.Lit(new Color(0.42f, 0.48f, 0.28f), 0.35f);
            var darkM = MeshUtil.Lit(new Color(0.18f, 0.2f, 0.14f), 0.3f);
            var finM = MeshUtil.Lit(new Color(0.55f, 0.42f, 0.22f), 0.25f);

            var root = new GameObject("Perch");
            var actor = root.AddComponent<FishActor>();
            var body = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            body.name = "Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localScale = new Vector3(0.18f, 0.14f, 0.42f);
            Object.Destroy(body.GetComponent<Collider>());
            body.GetComponent<MeshRenderer>().sharedMaterial = bodyM;

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.transform.SetParent(root.transform, false);
            head.transform.localPosition = new Vector3(0, 0.01f, 0.16f);
            head.transform.localScale = new Vector3(0.12f, 0.11f, 0.14f);
            Object.Destroy(head.GetComponent<Collider>());
            head.GetComponent<MeshRenderer>().sharedMaterial = bodyM;

            actor._tail = new GameObject("Tail").transform;
            actor._tail.SetParent(root.transform, false);
            actor._tail.localPosition = new Vector3(0, 0, -0.2f);
            var tail = GameObject.CreatePrimitive(PrimitiveType.Cube);
            tail.transform.SetParent(actor._tail, false);
            tail.transform.localPosition = new Vector3(0, 0, -0.06f);
            tail.transform.localScale = new Vector3(0.02f, 0.14f, 0.12f);
            Object.Destroy(tail.GetComponent<Collider>());
            tail.GetComponent<MeshRenderer>().sharedMaterial = finM;

            var dorsal = GameObject.CreatePrimitive(PrimitiveType.Cube);
            dorsal.transform.SetParent(root.transform, false);
            dorsal.transform.localPosition = new Vector3(0, 0.08f, 0);
            dorsal.transform.localScale = new Vector3(0.015f, 0.1f, 0.16f);
            Object.Destroy(dorsal.GetComponent<Collider>());
            dorsal.GetComponent<MeshRenderer>().sharedMaterial = darkM;

            var stripe = GameObject.CreatePrimitive(PrimitiveType.Cube);
            stripe.transform.SetParent(root.transform, false);
            stripe.transform.localScale = new Vector3(0.185f, 0.04f, 0.08f);
            Object.Destroy(stripe.GetComponent<Collider>());
            stripe.GetComponent<MeshRenderer>().sharedMaterial = darkM;

            root.SetActive(false);
            return root;
        }

        void Update()
        {
            var v = (transform.position - _prev) / Mathf.Max(Time.deltaTime, 0.0001f);
            _prev = transform.position;
            if (v.sqrMagnitude > 0.01f)
            {
                var look = Quaternion.LookRotation(v.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, look, 1f - Mathf.Exp(-8f * Time.deltaTime));
            }
            if (_tail) _tail.localRotation = Quaternion.Euler(0, Mathf.Sin(Time.time * 14f) * 18f, 0);
        }
    }
}
