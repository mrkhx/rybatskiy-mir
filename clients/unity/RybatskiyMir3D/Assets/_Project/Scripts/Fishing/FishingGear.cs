using UnityEngine;
using RybatskiyMir.World;

namespace RybatskiyMir.Fishing
{
    /// <summary>
    /// Procedural 6-bone rod. Length axis is +Y.
    /// While fishing, world rotation is driven so the tip points at the water,
    /// independent of the hand's -Y bone chain.
    /// </summary>
    [DefaultExecutionOrder(200)]
    public class FishingGear : MonoBehaviour
    {
        public Transform Hand;
        public Transform Tip;
        public Transform[] Bones;
        public LineRenderer Line;
        public Transform Float;
        public Transform Fish;
        public float Bend;
        Vector3[] _line = new Vector3[10];
        Quaternion[] _boneRest;
        Quaternion _gripLocal = Quaternion.Euler(180f, 0f, 0f);
        Vector3 _aimPoint;
        bool _aimWater;

        public static FishingGear Build(Transform rightHand)
        {
            var gear = new GameObject("Gear").AddComponent<FishingGear>();
            var cork = MeshUtil.Lit(new Color(0.45f, 0.32f, 0.18f), 0.22f, false, TextureFactory.Wood);
            var blank = MeshUtil.Lit(new Color(0.14f, 0.15f, 0.13f), 0.55f);
            var wrap = MeshUtil.Lit(new Color(0.55f, 0.16f, 0.12f), 0.32f);

            var root = new GameObject("Rod").transform;
            root.SetParent(rightHand, false);
            // Palm offset. World aim in LateUpdate overrides rotation.
            root.localPosition = new Vector3(0.015f, -0.045f, 0.02f);
            root.localRotation = gear._gripLocal;
            gear.Hand = root;
            gear.Bones = new Transform[6];
            Transform parent = root;
            float[] lengths = { 0.22f, 0.28f, 0.32f, 0.34f, 0.36f, 0.38f };
            float[] radii = { 0.018f, 0.015f, 0.012f, 0.009f, 0.007f, 0.005f };
            for (int i = 0; i < 6; i++)
            {
                var bone = new GameObject("Bone_" + i).transform;
                bone.SetParent(parent, false);
                bone.localPosition = i == 0 ? new Vector3(0, 0.02f, 0) : new Vector3(0, lengths[i - 1], 0);
                bone.localRotation = Quaternion.identity;
                var seg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                seg.transform.SetParent(bone, false);
                seg.transform.localPosition = new Vector3(0, lengths[i] * 0.5f, 0);
                seg.transform.localScale = new Vector3(radii[i] * 2f, lengths[i] * 0.5f, radii[i] * 2f);
                Object.Destroy(seg.GetComponent<Collider>());
                seg.GetComponent<MeshRenderer>().sharedMaterial = i == 0 ? cork : i == 1 ? wrap : blank;
                gear.Bones[i] = bone;
                parent = bone;

                if (i == 0)
                {
                    var reel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    reel.name = "Reel";
                    reel.transform.SetParent(bone, false);
                    reel.transform.localPosition = new Vector3(0.04f, 0.08f, 0);
                    reel.transform.localRotation = Quaternion.Euler(0, 0, 90f);
                    reel.transform.localScale = new Vector3(0.055f, 0.018f, 0.055f);
                    Object.Destroy(reel.GetComponent<Collider>());
                    reel.GetComponent<MeshRenderer>().sharedMaterial = MeshUtil.Lit(new Color(0.18f, 0.20f, 0.18f), 0.55f);
                    var spool = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    spool.transform.SetParent(reel.transform, false);
                    spool.transform.localScale = new Vector3(0.72f, 0.55f, 0.72f);
                    Object.Destroy(spool.GetComponent<Collider>());
                    spool.GetComponent<MeshRenderer>().sharedMaterial = MeshUtil.Lit(new Color(0.72f, 0.55f, 0.22f), 0.35f);
                }
                if (i >= 1)
                {
                    var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    ring.name = "Guide";
                    ring.transform.SetParent(bone, false);
                    ring.transform.localPosition = new Vector3(0, lengths[i] * 0.85f, 0.012f);
                    ring.transform.localRotation = Quaternion.Euler(90f, 0, 0);
                    ring.transform.localScale = new Vector3(radii[i] * 3.2f, 0.004f, radii[i] * 3.2f);
                    Object.Destroy(ring.GetComponent<Collider>());
                    ring.GetComponent<MeshRenderer>().sharedMaterial = MeshUtil.Lit(new Color(0.55f, 0.55f, 0.52f), 0.7f);
                }
            }
            var tip = new GameObject("Tip");
            tip.transform.SetParent(parent, false);
            tip.transform.localPosition = new Vector3(0, lengths[5], 0);
            gear.Tip = tip.transform;
            gear._boneRest = new Quaternion[gear.Bones.Length];
            for (int i = 0; i < gear.Bones.Length; i++) gear._boneRest[i] = gear.Bones[i].localRotation;

            var lr = gear.gameObject.AddComponent<LineRenderer>();
            lr.positionCount = gear._line.Length;
            lr.material = MeshUtil.Unlit(new Color(0.88f, 0.86f, 0.78f, 0.85f));
            lr.startColor = new Color(0.92f, 0.90f, 0.82f, 0.92f);
            lr.endColor = new Color(0.88f, 0.86f, 0.78f, 0.4f);
            lr.startWidth = 0.008f;
            lr.endWidth = 0.004f;
            lr.numCapVertices = 2;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            lr.useWorldSpace = true;
            gear.Line = lr;

            var flo = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            flo.name = "Float";
            flo.transform.localScale = new Vector3(0.045f, 0.09f, 0.045f);
            Object.Destroy(flo.GetComponent<Collider>());
            flo.GetComponent<MeshRenderer>().sharedMaterial = MeshUtil.Lit(new Color(0.78f, 0.2f, 0.16f), 0.4f);
            var antenna = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            antenna.transform.SetParent(flo.transform, false);
            antenna.transform.localPosition = new Vector3(0, 0.7f, 0);
            antenna.transform.localScale = new Vector3(0.12f, 0.55f, 0.12f);
            Object.Destroy(antenna.GetComponent<Collider>());
            antenna.GetComponent<MeshRenderer>().sharedMaterial = MeshUtil.Lit(new Color(0.9f, 0.85f, 0.2f), 0.5f);
            gear.Float = flo.transform;

            var fishGo = FishActor.Build();
            gear.Fish = fishGo.transform;

            gear.SetVisible(false, false, false, false);
            return gear;
        }

        public void AimAt(Vector3 worldPoint)
        {
            _aimPoint = worldPoint;
            _aimWater = true;
        }

        public void ClearAim()
        {
            _aimWater = false;
            if (Hand) Hand.localRotation = _gripLocal;
        }

        public void SetVisible(bool rod, bool line, bool bobber, bool fish)
        {
            if (Hand) Hand.gameObject.SetActive(rod);
            if (Line) Line.enabled = line;
            if (Float) Float.gameObject.SetActive(bobber);
            if (Fish) Fish.gameObject.SetActive(fish);
            if (!rod) ClearAim();
        }

        public void BendRod(float amount)
        {
            Bend = Mathf.Clamp01(amount);
            if (Bones == null) return;
            for (int i = 0; i < Bones.Length; i++)
            {
                var w = (i + 1) / (float)Bones.Length;
                // After AimAt, rod +Y is the length and +X is world-right-ish.
                // Bend around +X droops the tip toward the water.
                var extra = Quaternion.Euler(Bend * 16f * w, 0f, 0f);
                Bones[i].localRotation = _boneRest[i] * extra;
            }
        }

        public void DrawLine(Vector3 from, Vector3 to, float sag)
        {
            if (!Line) return;
            Line.positionCount = _line.Length;
            for (int i = 0; i < _line.Length; i++)
            {
                var t = i / (float)(_line.Length - 1);
                var pt = Vector3.Lerp(from, to, t);
                pt.y -= Mathf.Sin(t * Mathf.PI) * sag;
                _line[i] = pt;
            }
            Line.SetPositions(_line);
        }

        public Vector3 TipPos => Tip ? Tip.position : transform.position;

        void LateUpdate()
        {
            if (!_aimWater || !Hand || !Hand.gameObject.activeInHierarchy) return;
            var origin = Hand.position;
            var dir = _aimPoint - origin;
            if (dir.sqrMagnitude < 0.0001f) return;
            dir.Normalize();
            var up = Vector3.up;
            if (Mathf.Abs(Vector3.Dot(dir, up)) > 0.98f)
                up = Hand.parent ? Hand.parent.right : Vector3.right;
            // LookRotation aims +Z; rod length is +Y → extra +90 X maps +Y onto dir.
            Hand.rotation = Quaternion.LookRotation(dir, up) * Quaternion.Euler(90f, 0f, 0f);
#if UNITY_EDITOR
            if (Vector3.Dot(Hand.up, dir) < 0.5f)
                Debug.LogWarning($"Rod +Y is not aiming at water (dot {Vector3.Dot(Hand.up, dir):F2}).");
#endif
        }

#if UNITY_EDITOR
        void OnDrawGizmos()
        {
            if (!_aimWater || !Hand) return;
            Gizmos.color = new Color(0.2f, 0.85f, 1f, 0.9f);
            Gizmos.DrawLine(Hand.position, _aimPoint);
            Gizmos.DrawSphere(_aimPoint, 0.08f);
            if (Tip)
            {
                Gizmos.color = new Color(1f, 0.85f, 0.15f, 0.95f);
                Gizmos.DrawRay(Tip.position, Tip.up * 2.4f);
            }
        }
#endif
    }
}
