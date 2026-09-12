using UnityEngine;
using RybatskiyMir.World;

namespace RybatskiyMir.Fishing
{
    /// <summary>
    /// Procedural 6-bone rod. Line is a LineRenderer from tip to float/fish.
    /// </summary>
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

        public static FishingGear Build(Transform rightHand)
        {
            var gear = new GameObject("Gear").AddComponent<FishingGear>();
            var cork = MeshUtil.Lit(new Color(0.45f, 0.32f, 0.18f), 0.2f);
            var blank = MeshUtil.Lit(new Color(0.15f, 0.16f, 0.14f), 0.45f);
            var wrap = MeshUtil.Lit(new Color(0.55f, 0.18f, 0.14f), 0.3f);

            var root = new GameObject("Rod").transform;
            root.SetParent(rightHand, false);
            root.localPosition = Vector3.zero;
            root.localRotation = Quaternion.Euler(8f, 0f, 0f);
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
            }
            var tip = new GameObject("Tip");
            tip.transform.SetParent(parent, false);
            tip.transform.localPosition = new Vector3(0, lengths[5], 0);
            gear.Tip = tip.transform;
            gear._boneRest = new Quaternion[gear.Bones.Length];
            for (int i = 0; i < gear.Bones.Length; i++) gear._boneRest[i] = gear.Bones[i].localRotation;

            var lr = gear.gameObject.AddComponent<LineRenderer>();
            lr.positionCount = gear._line.Length;
            lr.startWidth = 0.01f;
            lr.endWidth = 0.006f;
            lr.material = new Material(Shader.Find("Sprites/Default") ?? Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Color"));
            lr.startColor = new Color(0.9f, 0.88f, 0.8f, 0.9f);
            lr.endColor = new Color(0.9f, 0.88f, 0.8f, 0.45f);
            lr.numCapVertices = 2;
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

        public void SetVisible(bool rod, bool line, bool bobber, bool fish)
        {
            if (Hand) Hand.gameObject.SetActive(rod);
            if (Line) Line.enabled = line;
            if (Float) Float.gameObject.SetActive(bobber);
            if (Fish) Fish.gameObject.SetActive(fish);
        }

        public void BendRod(float amount)
        {
            Bend = Mathf.Clamp01(amount);
            if (Bones == null) return;
            for (int i = 0; i < Bones.Length; i++)
            {
                var w = (i + 1) / (float)Bones.Length;
                var extra = Quaternion.Euler(Bend * 18f * w, 0, Bend * 4f * w);
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
    }
}
