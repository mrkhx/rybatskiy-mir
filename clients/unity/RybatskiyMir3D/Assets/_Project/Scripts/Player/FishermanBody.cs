using UnityEngine;
using RybatskiyMir.World;

namespace RybatskiyMir.Player
{
    public enum FishermanPose
    {
        Idle, Walk, Run, Sit, Aim, Cast, Wait, Hook, Fight, Land
    }

    /// <summary>
    /// Pose driver for the fisherman. Primary visual is the authored FBX
    /// (Resources/SM_Fisherman). Primitive capsules exist only as a fallback
    /// if the FBX is missing.
    /// </summary>
    [DefaultExecutionOrder(50)]
    public class FishermanBody : MonoBehaviour
    {
        public FishermanPose Pose = FishermanPose.Idle;
        public float MoveSpeed;
        public float CastT;
        public float Tension;
        public Transform RightHand { get; private set; }
        public Transform LeftHand { get; private set; }
        public Transform Hip { get; private set; }
        public Transform Spine => _spine;
        public Transform RightHandGrip { get; private set; }
        public Transform BackRodMount { get; private set; }
        public bool Authored { get; private set; }

        Transform _spine, _chest, _head, _neck;
        Transform _lU, _lL, _rU, _rL;
        Transform _lLegU, _lLegL, _rLegU, _rLegL;
        Vector3 _hipRest;
        Quaternion _hipRestRot, _spineRest, _chestRest, _neckRest, _headRest;
        Quaternion _lURest, _lLRest, _rURest, _rLRest;
        Quaternion _lLegURest, _lLegLRest, _rLegURest, _rLegLRest;
        float _phase;
        float _breath;
        const float ArmHang = 72f;

        public static FishermanBody Build(Transform root)
        {
            var body = root.gameObject.AddComponent<FishermanBody>();
            var prefab = Resources.Load<GameObject>("SM_Fisherman");
            if (prefab != null)
            {
                var inst = Object.Instantiate(prefab, root, false);
                inst.name = "SM_Fisherman";
                inst.transform.localPosition = Vector3.zero;
                inst.transform.localRotation = Quaternion.identity;
                inst.transform.localScale = Vector3.one;
                if (body.BindAuthored(inst.transform))
                    return body;
                Object.Destroy(inst);
            }
            BuildPrimitive(root, body);
            return body;
        }

        public Transform RodHand => RightHandGrip ? RightHandGrip : RightHand;
        public Transform RodHolster => BackRodMount ? BackRodMount : _spine;

        bool BindAuthored(Transform model)
        {
            foreach (var anim in model.GetComponentsInChildren<Animator>(true))
            {
                anim.enabled = false;
                anim.applyRootMotion = false;
            }

            Hip = FindBone(model, "Hips", "mixamorig:Hips");
            _spine = FindBone(model, "Spine", "mixamorig:Spine");
            _chest = FindBone(model, "Spine1", "Chest", "mixamorig:Spine1");
            if (_chest == null) _chest = _spine;
            var upper = FindBone(model, "Spine2", "UpperChest", "mixamorig:Spine2");
            _neck = FindBone(model, "Neck", "mixamorig:Neck");
            _head = FindBone(model, "Head", "mixamorig:Head");
            _lU = FindBone(model, "LeftArm", "LeftUpperArm", "mixamorig:LeftArm");
            _lL = FindBone(model, "LeftForeArm", "LeftLowerArm", "mixamorig:LeftForeArm");
            LeftHand = FindBone(model, "LeftHand", "mixamorig:LeftHand");
            _rU = FindBone(model, "RightArm", "RightUpperArm", "mixamorig:RightArm");
            _rL = FindBone(model, "RightForeArm", "RightLowerArm", "mixamorig:RightForeArm");
            RightHand = FindBone(model, "RightHand", "mixamorig:RightHand");
            _lLegU = FindBone(model, "LeftUpLeg", "LeftUpperLeg", "mixamorig:LeftUpLeg");
            _lLegL = FindBone(model, "LeftLeg", "LeftLowerLeg", "mixamorig:LeftLeg");
            _rLegU = FindBone(model, "RightUpLeg", "RightUpperLeg", "mixamorig:RightUpLeg");
            _rLegL = FindBone(model, "RightLeg", "RightLowerLeg", "mixamorig:RightLeg");
            RightHandGrip = FindBone(model, "RightHandGrip", "RodGrip");
            BackRodMount = FindBone(model, "BackRodMount");

            if (Hip == null || _spine == null || _lU == null || _rU == null || RightHand == null)
                return false;

            Authored = true;
            _hipRest = Hip.localPosition;
            CacheRest();
            return true;
        }

        void CacheRest()
        {
            _hipRestRot = Hip.localRotation;
            _spineRest = _spine.localRotation;
            _chestRest = _chest ? _chest.localRotation : Quaternion.identity;
            _neckRest = _neck ? _neck.localRotation : Quaternion.identity;
            _headRest = _head ? _head.localRotation : Quaternion.identity;
            _lURest = _lU.localRotation;
            _lLRest = _lL.localRotation;
            _rURest = _rU.localRotation;
            _rLRest = _rL.localRotation;
            _lLegURest = _lLegU.localRotation;
            _lLegLRest = _lLegL.localRotation;
            _rLegURest = _rLegU.localRotation;
            _rLegLRest = _rLegL.localRotation;
        }

        static Transform FindBone(Transform root, params string[] names)
        {
            var all = root.GetComponentsInChildren<Transform>(true);
            foreach (var want in names)
            {
                foreach (var t in all)
                {
                    var n = t.name;
                    var colon = n.LastIndexOf(':');
                    if (colon >= 0) n = n.Substring(colon + 1);
                    if (n == want || t.name == want) return t;
                }
            }
            return null;
        }

        void LateUpdate()
        {
            var dt = Time.deltaTime;
            _phase += dt * (Pose == FishermanPose.Run ? 9.4f : 6.6f);
            _breath += dt;
            var walk = Mathf.Clamp01(MoveSpeed / 3.15f);
            var run = Mathf.Clamp01((MoveSpeed - 3.15f) / 2.3f);

            Quaternion hip = Quaternion.identity;
            Quaternion spine = Quaternion.identity;
            Quaternion chest = Quaternion.identity;
            Quaternion neck = Quaternion.identity;
            Vector3 hipPos = _hipRest;
            Quaternion lU = Quaternion.Euler(6f, 0, 10);
            Quaternion rU = Quaternion.Euler(6f, 0, -10);
            Quaternion lL = Quaternion.Euler(8f, 0, 0);
            Quaternion rL = Quaternion.Euler(8f, 0, 0);
            Quaternion lLegU = Quaternion.identity;
            Quaternion rLegU = Quaternion.identity;
            Quaternion lLegL = Quaternion.identity;
            Quaternion rLegL = Quaternion.identity;
            Quaternion head = Quaternion.identity;

            if (Pose is FishermanPose.Idle or FishermanPose.Walk or FishermanPose.Run)
            {
                var amp = Mathf.Lerp(4f, 24f, walk) + run * 10f;
                var swing = Mathf.Sin(_phase) * amp;
                var knee = Mathf.Max(0f, Mathf.Sin(_phase));
                lLegU = Quaternion.Euler(swing, 0, 0);
                rLegU = Quaternion.Euler(-swing, 0, 0);
                lLegL = Quaternion.Euler(-knee * 0.85f * amp, 0, 0);
                rLegL = Quaternion.Euler(-Mathf.Max(0f, -Mathf.Sin(_phase)) * 0.85f * amp, 0, 0);
                lU = Quaternion.Euler(-swing * 0.65f, 0, 11);
                rU = Quaternion.Euler(swing * 0.65f, 0, -11);
                lL = Quaternion.Euler(8f + Mathf.Max(0, -swing) * 0.25f, 0, 0);
                rL = Quaternion.Euler(8f + Mathf.Max(0, swing) * 0.25f, 0, 0);
                hip = Quaternion.Euler(walk * 3f, swing * 0.12f, 0);
                spine = Quaternion.Euler(walk * 5f + Mathf.Sin(_breath * 1.5f) * 1.4f, 0, 0);
                hipPos.y += Mathf.Abs(Mathf.Sin(_phase * 2f)) * walk * 0.035f;
                if (walk < 0.05f)
                {
                    var shift = Mathf.Sin(_breath * 0.7f) * 1.8f;
                    spine = Quaternion.Euler(Mathf.Sin(_breath * 1.35f) * 2.0f, 0, shift * 0.3f);
                    hip = Quaternion.Euler(0, 0, shift * 0.4f);
                    lU = Quaternion.Euler(10f, 4f, 14f);
                    rU = Quaternion.Euler(8f, -6f, -12f);
                    lL = Quaternion.Euler(12f, 0, 0);
                    rL = Quaternion.Euler(14f, 0, 0);
                    lLegU = Quaternion.Euler(2f, -3f, 0);
                    rLegU = Quaternion.Euler(4f, 3f, 0);
                }
                neck = Quaternion.Euler(-walk * 2f, 0, 0);
            }
            else
            {
                ApplySitBase(ref hipPos, ref hip, ref lLegU, ref rLegU, ref lLegL, ref rLegL, ref spine);
                lU = Quaternion.Euler(-36f, 22f, 28f);
                lL = Quaternion.Euler(-42f, 0, 0);
                rU = Quaternion.Euler(-58f, -8f, -22f);
                rL = Quaternion.Euler(-52f, 4f, 8f);
                chest = Quaternion.Euler(6f, 8f, 0);
                neck = Quaternion.Euler(-6f, 6f, 0);
                head = Quaternion.Euler(-8f, 8f, 0);

                if (Pose == FishermanPose.Aim)
                {
                    rU = Quaternion.Euler(-70f, -4f, -16f);
                    rL = Quaternion.Euler(-40f, 4f, 6f);
                    lU = Quaternion.Euler(-44f, 18f, 26f);
                    lL = Quaternion.Euler(-48f, 0, 0);
                    chest = Quaternion.Euler(8f, 12f, 0);
                    head = Quaternion.Euler(-10f, 10f, 0);
                }
                else if (Pose == FishermanPose.Cast)
                {
                    var t = Mathf.Clamp01(CastT);
                    float back = t < 0.38f ? t / 0.38f : Mathf.Clamp01(1f - (t - 0.38f) / 0.62f * 1.35f);
                    float fwd = t < 0.38f ? 0 : Mathf.Clamp01((t - 0.38f) / 0.18f);
                    rU = Quaternion.Euler(Mathf.Lerp(-20f, -108f, back) + fwd * -12f, -6f, -12f);
                    rL = Quaternion.Euler(Mathf.Lerp(-28f, -18f, fwd), 0, 0);
                    chest = Quaternion.Euler(Mathf.Lerp(8f, -10f, back) + fwd * 18f, fwd * 12f, 0);
                    spine = Quaternion.Euler(12f, 0, 0);
                    lU = Quaternion.Euler(-28f, 18f, 22f);
                    head = Quaternion.Euler(fwd * -8f, fwd * 6f, 0);
                }
                else if (Pose == FishermanPose.Hook)
                {
                    rU = Quaternion.Euler(-96f, -4f, -10f);
                    rL = Quaternion.Euler(-18f, 0, 4f);
                    chest = Quaternion.Euler(-8f, 8f, 0);
                    spine = Quaternion.Euler(4f, 0, 0);
                    lU = Quaternion.Euler(-38f, 14f, 20f);
                    head = Quaternion.Euler(-12f, 8f, 0);
                }
                else if (Pose == FishermanPose.Fight)
                {
                    var yank = Mathf.Sin(Time.time * (2.1f + Tension * 2.8f)) * (7f + Tension * 12f);
                    hip = Quaternion.Euler(12f, yank * 0.35f, 0);
                    lLegU = Quaternion.Euler(-80f, -10f, 0);
                    rLegU = Quaternion.Euler(-88f, 10f, 0);
                    rU = Quaternion.Euler(-64f + yank, -8f, -16f);
                    rL = Quaternion.Euler(-38f, 0, 6f);
                    lU = Quaternion.Euler(-48f + yank * 0.35f, 16f, 22f);
                    lL = Quaternion.Euler(-36f, 0, 0);
                    chest = Quaternion.Euler(12f + yank * 0.28f, 8f + yank * 0.45f, 0);
                    spine = Quaternion.Euler(16f, 0, 0);
                    head = Quaternion.Euler(-8f, 8f + yank * 0.2f, 0);
                }
                else if (Pose == FishermanPose.Land)
                {
                    hipPos = _hipRest + new Vector3(0, -0.42f, 0.04f);
                    hip = Quaternion.Euler(8f, 0, 0);
                    lLegU = Quaternion.Euler(-72f, -8f, 0);
                    rLegU = Quaternion.Euler(-72f, 8f, 0);
                    lLegL = Quaternion.Euler(66f, 0, 0);
                    rLegL = Quaternion.Euler(66f, 0, 0);
                    rU = Quaternion.Euler(-36f, -12f, -14f);
                    rL = Quaternion.Euler(-48f, 8f, 6f);
                    lU = Quaternion.Euler(-32f, 22f, 12f);
                    lL = Quaternion.Euler(-40f, 0, 0);
                    chest = Quaternion.Euler(10f, 8f, 0);
                    head = Quaternion.Euler(4f, 6f, 0);
                }
                else if (Pose == FishermanPose.Wait)
                {
                    rU = Quaternion.Euler(-62f, -6f, -18f);
                    rL = Quaternion.Euler(-46f, 4f, 6f);
                    lU = Quaternion.Euler(-40f, 16f, 24f);
                    lL = Quaternion.Euler(-44f, 0, 0);
                    chest = Quaternion.Euler(8f + Mathf.Sin(_breath * 1.2f) * 1.5f, 8f, 0);
                    head = Quaternion.Euler(-6f, 8f, 0);
                }
            }

            float k = 1f - Mathf.Exp(-11f * dt);
            ApplyBone(Hip, _hipRestRot, hip, k);
            Hip.localPosition = Vector3.Lerp(Hip.localPosition, hipPos, k);
            ApplyBone(_spine, _spineRest, spine, k);
            if (_chest) ApplyBone(_chest, _chestRest, chest, k);
            if (_neck) ApplyBone(_neck, _neckRest, neck, k);
            if (_head) ApplyBone(_head, _headRest, head, k);
            ApplyArm(_lU, _lURest, lU, ArmHang, k);
            ApplyArm(_rU, _rURest, rU, -ArmHang, k);
            ApplyBone(_lL, _lLRest, lL, k);
            ApplyBone(_rL, _rLRest, rL, k);
            ApplyBone(_lLegU, _lLegURest, lLegU, k);
            ApplyBone(_rLegU, _rLegURest, rLegU, k);
            ApplyBone(_lLegL, _lLegLRest, lLegL, k);
            ApplyBone(_rLegL, _rLegLRest, rLegL, k);
        }

        void ApplyBone(Transform t, Quaternion rest, Quaternion delta, float k)
        {
            if (!t) return;
            var target = Authored ? rest * delta : delta;
            t.localRotation = Quaternion.Slerp(t.localRotation, target, k);
        }

        void ApplyArm(Transform t, Quaternion rest, Quaternion hangingDelta, float hangZ, float k)
        {
            if (!t) return;
            var target = Authored
                ? rest * Quaternion.Euler(0f, 0f, hangZ) * hangingDelta
                : hangingDelta;
            t.localRotation = Quaternion.Slerp(t.localRotation, target, k);
        }

        static void ApplySitBase(ref Vector3 hipPos, ref Quaternion hip,
            ref Quaternion lLegU, ref Quaternion rLegU, ref Quaternion lLegL, ref Quaternion rLegL,
            ref Quaternion spine)
        {
            hipPos = new Vector3(hipPos.x, hipPos.y - 0.46f, hipPos.z + 0.06f);
            hip = Quaternion.Euler(14f, 0, 0);
            lLegU = Quaternion.Euler(-86f, -8f, 0);
            rLegU = Quaternion.Euler(-86f, 8f, 0);
            lLegL = Quaternion.Euler(82f, 0, 0);
            rLegL = Quaternion.Euler(82f, 0, 0);
            spine = Quaternion.Euler(16f, 0, 0);
        }

        static Transform Bone(string name, Transform parent, Vector3 local)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            t.localPosition = local;
            t.localRotation = Quaternion.identity;
            return t;
        }

        static void BuildPrimitive(Transform root, FishermanBody body)
        {
            var jacket = MeshUtil.Lit(Palette.Jacket, 0.18f, false, TextureFactory.Cloth);
            var vest = MeshUtil.Lit(Palette.Vest, 0.16f, false, TextureFactory.Cloth);
            var pants = MeshUtil.Lit(Palette.Pants, 0.14f, false, TextureFactory.Cloth);
            var boot = MeshUtil.Lit(Palette.Boots, 0.22f);
            var skin = MeshUtil.Lit(Palette.Skin, 0.35f);
            var cap = MeshUtil.Lit(Palette.Cap, 0.16f, false, TextureFactory.Cloth);
            var shirt = MeshUtil.Lit(Palette.Shirt, 0.16f, false, TextureFactory.Cloth);
            var dark = MeshUtil.Lit(new Color(0.12f, 0.10f, 0.08f), 0.2f);
            var strap = MeshUtil.Lit(new Color(0.28f, 0.18f, 0.10f), 0.18f);

            var rig = new GameObject("Rig");
            rig.transform.SetParent(root, false);

            body.Hip = Bone("Hips", rig.transform, new Vector3(0, 0.94f, 0));
            body._hipRest = body.Hip.localPosition;
            MeshUtil.Prim("Pelvis", PrimitiveType.Capsule, body.Hip, new Vector3(0, -0.02f, 0.01f), new Vector3(0.34f, 0.11f, 0.20f), pants);
            MeshUtil.Prim("Belt", PrimitiveType.Cylinder, body.Hip, new Vector3(0, 0.06f, 0.01f), new Vector3(0.36f, 0.025f, 0.22f), strap);

            body._spine = Bone("Spine", body.Hip, new Vector3(0, 0.14f, 0.01f));
            body._chest = Bone("Chest", body._spine, new Vector3(0, 0.20f, 0.02f));
            MeshUtil.Prim("Torso", PrimitiveType.Capsule, body._chest, new Vector3(0, -0.04f, 0.02f), new Vector3(0.40f, 0.28f, 0.26f), jacket);
            MeshUtil.Prim("Hem", PrimitiveType.Cylinder, body._chest, new Vector3(0, -0.28f, 0.02f), new Vector3(0.42f, 0.035f, 0.28f), jacket);
            MeshUtil.Prim("Vest", PrimitiveType.Cube, body._chest, new Vector3(0, -0.04f, 0.12f), new Vector3(0.26f, 0.34f, 0.07f), vest);
            MeshUtil.Prim("PocketL", PrimitiveType.Cube, body._chest, new Vector3(-0.08f, -0.08f, 0.16f), new Vector3(0.07f, 0.08f, 0.03f), vest);
            MeshUtil.Prim("PocketR", PrimitiveType.Cube, body._chest, new Vector3(0.08f, -0.08f, 0.16f), new Vector3(0.07f, 0.08f, 0.03f), vest);

            body._neck = Bone("Neck", body._chest, new Vector3(0, 0.34f, 0.02f));
            MeshUtil.Prim("NeckM", PrimitiveType.Cylinder, body._neck, new Vector3(0, 0.02f, 0), new Vector3(0.09f, 0.055f, 0.09f), skin);

            body._head = Bone("Head", body._neck, new Vector3(0, 0.14f, 0.01f));
            MeshUtil.Prim("Skull", PrimitiveType.Sphere, body._head, new Vector3(0, 0.02f, 0.01f), Vector3.one * 0.22f, skin);
            MeshUtil.Prim("Jaw", PrimitiveType.Sphere, body._head, new Vector3(0, -0.05f, 0.03f), new Vector3(0.16f, 0.10f, 0.16f), skin);
            MeshUtil.Prim("Nose", PrimitiveType.Sphere, body._head, new Vector3(0, 0f, 0.11f), Vector3.one * 0.04f, skin);
            MeshUtil.Prim("EarL", PrimitiveType.Sphere, body._head, new Vector3(-0.11f, 0.02f, 0.01f), new Vector3(0.03f, 0.05f, 0.025f), skin);
            MeshUtil.Prim("EarR", PrimitiveType.Sphere, body._head, new Vector3(0.11f, 0.02f, 0.01f), new Vector3(0.03f, 0.05f, 0.025f), skin);
            MeshUtil.Prim("EyeL", PrimitiveType.Sphere, body._head, new Vector3(-0.04f, 0.03f, 0.095f), new Vector3(0.035f, 0.026f, 0.022f), dark);
            MeshUtil.Prim("EyeR", PrimitiveType.Sphere, body._head, new Vector3(0.04f, 0.03f, 0.095f), new Vector3(0.035f, 0.026f, 0.022f), dark);
            MeshUtil.Prim("Hair", PrimitiveType.Sphere, body._head, new Vector3(0, 0.07f, -0.02f), new Vector3(0.20f, 0.10f, 0.18f), dark);
            MeshUtil.Prim("Cap", PrimitiveType.Sphere, body._head, new Vector3(0, 0.08f, 0), new Vector3(0.21f, 0.08f, 0.21f), cap);
            MeshUtil.Prim("Brim", PrimitiveType.Cylinder, body._head, new Vector3(0, 0.05f, 0.09f), new Vector3(0.18f, 0.012f, 0.14f), cap);

            var lClav = Bone("LeftShoulder", body._chest, new Vector3(-0.22f, 0.22f, 0));
            var rClav = Bone("RightShoulder", body._chest, new Vector3(0.22f, 0.22f, 0));
            MeshUtil.Prim("L_Shoulder", PrimitiveType.Sphere, lClav, Vector3.zero, Vector3.one * 0.13f, jacket);
            MeshUtil.Prim("R_Shoulder", PrimitiveType.Sphere, rClav, Vector3.zero, Vector3.one * 0.13f, jacket);
            body._lU = Bone("LeftUpperArm", lClav, new Vector3(-0.04f, -0.05f, 0));
            body._lL = Bone("LeftLowerArm", body._lU, new Vector3(0, -0.30f, 0));
            body.LeftHand = Bone("LeftHand", body._lL, new Vector3(0, -0.25f, 0));
            body._rU = Bone("RightUpperArm", rClav, new Vector3(0.04f, -0.05f, 0));
            body._rL = Bone("RightLowerArm", body._rU, new Vector3(0, -0.30f, 0));
            body.RightHand = Bone("RightHand", body._rL, new Vector3(0, -0.25f, 0));

            MeshUtil.Prim("L_UArmM", PrimitiveType.Capsule, body._lU, new Vector3(0, -0.15f, 0), new Vector3(0.10f, 0.15f, 0.10f), jacket);
            MeshUtil.Prim("L_LArmM", PrimitiveType.Capsule, body._lL, new Vector3(0, -0.12f, 0), new Vector3(0.08f, 0.12f, 0.08f), shirt);
            MeshUtil.Prim("L_HandM", PrimitiveType.Sphere, body.LeftHand, Vector3.zero, new Vector3(0.07f, 0.085f, 0.055f), skin);
            MeshUtil.Prim("R_UArmM", PrimitiveType.Capsule, body._rU, new Vector3(0, -0.15f, 0), new Vector3(0.10f, 0.15f, 0.10f), jacket);
            MeshUtil.Prim("R_LArmM", PrimitiveType.Capsule, body._rL, new Vector3(0, -0.12f, 0), new Vector3(0.08f, 0.12f, 0.08f), shirt);
            MeshUtil.Prim("R_HandM", PrimitiveType.Sphere, body.RightHand, Vector3.zero, new Vector3(0.07f, 0.085f, 0.055f), skin);

            body._lLegU = Bone("LeftUpperLeg", body.Hip, new Vector3(-0.10f, -0.08f, 0));
            body._lLegL = Bone("LeftLowerLeg", body._lLegU, new Vector3(0, -0.42f, 0));
            var lFoot = Bone("LeftFoot", body._lLegL, new Vector3(0, -0.40f, 0.04f));
            body._rLegU = Bone("RightUpperLeg", body.Hip, new Vector3(0.10f, -0.08f, 0));
            body._rLegL = Bone("RightLowerLeg", body._rLegU, new Vector3(0, -0.42f, 0));
            var rFoot = Bone("RightFoot", body._rLegL, new Vector3(0, -0.40f, 0.04f));

            MeshUtil.Prim("L_Thigh", PrimitiveType.Capsule, body._lLegU, new Vector3(0, -0.21f, 0), new Vector3(0.14f, 0.21f, 0.14f), pants);
            MeshUtil.Prim("L_Calf", PrimitiveType.Capsule, body._lLegL, new Vector3(0, -0.20f, 0), new Vector3(0.11f, 0.20f, 0.11f), pants);
            MeshUtil.Prim("L_Boot", PrimitiveType.Cube, lFoot, new Vector3(0, 0.02f, 0.06f), new Vector3(0.10f, 0.09f, 0.22f), boot);
            MeshUtil.Prim("R_Thigh", PrimitiveType.Capsule, body._rLegU, new Vector3(0, -0.21f, 0), new Vector3(0.14f, 0.21f, 0.14f), pants);
            MeshUtil.Prim("R_Calf", PrimitiveType.Capsule, body._rLegL, new Vector3(0, -0.20f, 0), new Vector3(0.11f, 0.20f, 0.11f), pants);
            MeshUtil.Prim("R_Boot", PrimitiveType.Cube, rFoot, new Vector3(0, 0.02f, 0.06f), new Vector3(0.10f, 0.09f, 0.22f), boot);

            body.CacheRest();
        }
    }
}
