using UnityEngine;
using RybatskiyMir.World;

namespace RybatskiyMir.Player
{
    public enum FishermanPose
    {
        Idle, Walk, Run, Sit, Aim, Cast, Wait, Hook, Fight, Land
    }

    /// <summary>
    /// Stylized semi-realistic fisherman built at runtime (art-bible palette).
    /// Placeholder until SK_Fisherman + animset. Not a capsule.
    /// </summary>
    [DefaultExecutionOrder(50)]
    public class FishermanBody : MonoBehaviour
    {
        public FishermanPose Pose = FishermanPose.Idle;
        public float MoveSpeed;
        public float CastT;
        public float Tension;
        public Transform RightHand { get; private set; }
        public Transform Hip { get; private set; }

        Transform _spine, _chest, _head, _neck;
        Transform _lU, _lL, _rU, _rL;
        Transform _lLegU, _lLegL, _rLegU, _rLegL;
        Vector3 _hipRest;
        float _phase;
        float _breath;

        public static FishermanBody Build(Transform root)
        {
            var jacket = MeshUtil.Lit(Palette.Jacket, 0.16f, false, TextureFactory.Cloth);
            var vest = MeshUtil.Lit(Palette.Vest, 0.14f, false, TextureFactory.Cloth);
            var pants = MeshUtil.Lit(Palette.Pants, 0.12f, false, TextureFactory.Cloth);
            var boot = MeshUtil.Lit(Palette.Boots, 0.22f);
            var skin = MeshUtil.Lit(Palette.Skin, 0.32f);
            var cap = MeshUtil.Lit(Palette.Cap, 0.14f, false, TextureFactory.Cloth);
            var shirt = MeshUtil.Lit(Palette.Shirt, 0.14f, false, TextureFactory.Cloth);
            var dark = MeshUtil.Lit(new Color(0.12f, 0.10f, 0.08f), 0.2f);
            var strap = MeshUtil.Lit(new Color(0.28f, 0.18f, 0.10f), 0.18f);

            var body = root.gameObject.AddComponent<FishermanBody>();
            var rig = new GameObject("Rig");
            rig.transform.SetParent(root, false);

            body.Hip = Bone("Hip", rig.transform, new Vector3(0, 0.94f, 0));
            body._hipRest = body.Hip.localPosition;
            Prim("Hips", PrimitiveType.Cube, body.Hip, new Vector3(0, -0.02f, 0.01f), new Vector3(0.34f, 0.16f, 0.22f), pants);
            Prim("Belt", PrimitiveType.Cube, body.Hip, new Vector3(0, 0.07f, 0.01f), new Vector3(0.36f, 0.05f, 0.24f), strap);

            body._spine = Bone("Spine", body.Hip, new Vector3(0, 0.14f, 0.01f));
            body._chest = Bone("Chest", body._spine, new Vector3(0, 0.20f, 0.02f));
            Prim("Jacket", PrimitiveType.Cube, body._chest, new Vector3(0, 0.10f, 0), new Vector3(0.44f, 0.50f, 0.28f), jacket);
            Prim("JacketHem", PrimitiveType.Cube, body._chest, new Vector3(0, -0.18f, 0), new Vector3(0.46f, 0.10f, 0.30f), jacket);
            Prim("Vest", PrimitiveType.Cube, body._chest, new Vector3(0, 0.06f, 0.06f), new Vector3(0.30f, 0.40f, 0.16f), vest);
            Prim("PocketL", PrimitiveType.Cube, body._chest, new Vector3(-0.08f, -0.02f, 0.13f), new Vector3(0.10f, 0.10f, 0.04f), vest);
            Prim("PocketR", PrimitiveType.Cube, body._chest, new Vector3(0.08f, -0.02f, 0.13f), new Vector3(0.10f, 0.10f, 0.04f), vest);
            Prim("Collar", PrimitiveType.Cube, body._chest, new Vector3(0, 0.32f, 0.02f), new Vector3(0.28f, 0.08f, 0.22f), jacket);

            body._neck = Bone("Neck", body._chest, new Vector3(0, 0.36f, 0.02f));
            Prim("NeckM", PrimitiveType.Cylinder, body._neck, Vector3.zero, new Vector3(0.09f, 0.05f, 0.09f), skin);

            body._head = Bone("Head", body._neck, new Vector3(0, 0.12f, 0.01f));
            Prim("Skull", PrimitiveType.Sphere, body._head, new Vector3(0, 0.02f, 0.01f), new Vector3(0.21f, 0.24f, 0.22f), skin);
            Prim("Nose", PrimitiveType.Sphere, body._head, new Vector3(0, -0.01f, 0.10f), Vector3.one * 0.045f, skin);
            Prim("EyeL", PrimitiveType.Sphere, body._head, new Vector3(-0.05f, 0.03f, 0.09f), new Vector3(0.035f, 0.03f, 0.02f), dark);
            Prim("EyeR", PrimitiveType.Sphere, body._head, new Vector3(0.05f, 0.03f, 0.09f), new Vector3(0.035f, 0.03f, 0.02f), dark);
            Prim("Hair", PrimitiveType.Sphere, body._head, new Vector3(0, 0.08f, -0.02f), new Vector3(0.20f, 0.10f, 0.18f), dark);
            var capT = Prim("Cap", PrimitiveType.Cylinder, body._head, new Vector3(0, 0.12f, 0), new Vector3(0.20f, 0.045f, 0.20f), cap);
            Prim("Brim", PrimitiveType.Cube, capT, new Vector3(0, -0.4f, 0.55f), new Vector3(0.9f, 0.12f, 0.7f), cap);

            var lClav = Bone("L_Clav", body._chest, new Vector3(-0.23f, 0.24f, 0));
            var rClav = Bone("R_Clav", body._chest, new Vector3(0.23f, 0.24f, 0));
            Prim("L_Shoulder", PrimitiveType.Sphere, lClav, Vector3.zero, Vector3.one * 0.12f, jacket);
            Prim("R_Shoulder", PrimitiveType.Sphere, rClav, Vector3.zero, Vector3.one * 0.12f, jacket);
            body._lU = Bone("L_UpperArm", lClav, new Vector3(-0.04f, -0.05f, 0));
            body._lL = Bone("L_LowerArm", body._lU, new Vector3(0, -0.30f, 0));
            Bone("L_Hand", body._lL, new Vector3(0, -0.25f, 0));
            body._rU = Bone("R_UpperArm", rClav, new Vector3(0.04f, -0.05f, 0));
            body._rL = Bone("R_LowerArm", body._rU, new Vector3(0, -0.30f, 0));
            body.RightHand = Bone("R_Hand", body._rL, new Vector3(0, -0.25f, 0));

            Prim("L_UArmM", PrimitiveType.Capsule, body._lU, new Vector3(0, -0.15f, 0), new Vector3(0.10f, 0.15f, 0.10f), jacket);
            Prim("L_LArmM", PrimitiveType.Capsule, body._lL, new Vector3(0, -0.12f, 0), new Vector3(0.075f, 0.13f, 0.075f), shirt);
            Prim("L_HandM", PrimitiveType.Sphere, body._lL, new Vector3(0, -0.25f, 0), Vector3.one * 0.07f, skin);
            Prim("R_UArmM", PrimitiveType.Capsule, body._rU, new Vector3(0, -0.15f, 0), new Vector3(0.10f, 0.15f, 0.10f), jacket);
            Prim("R_LArmM", PrimitiveType.Capsule, body._rL, new Vector3(0, -0.12f, 0), new Vector3(0.075f, 0.13f, 0.075f), shirt);
            Prim("R_HandM", PrimitiveType.Sphere, body.RightHand, Vector3.zero, Vector3.one * 0.07f, skin);

            body._lLegU = Bone("L_UpperLeg", body.Hip, new Vector3(-0.11f, -0.08f, 0));
            body._lLegL = Bone("L_LowerLeg", body._lLegU, new Vector3(0, -0.42f, 0));
            var lFoot = Bone("L_Foot", body._lLegL, new Vector3(0, -0.40f, 0.04f));
            body._rLegU = Bone("R_UpperLeg", body.Hip, new Vector3(0.11f, -0.08f, 0));
            body._rLegL = Bone("R_LowerLeg", body._rLegU, new Vector3(0, -0.42f, 0));
            var rFoot = Bone("R_Foot", body._rLegL, new Vector3(0, -0.40f, 0.04f));

            Prim("L_Thigh", PrimitiveType.Capsule, body._lLegU, new Vector3(0, -0.21f, 0), new Vector3(0.13f, 0.21f, 0.13f), pants);
            Prim("L_Calf", PrimitiveType.Capsule, body._lLegL, new Vector3(0, -0.19f, 0), new Vector3(0.10f, 0.19f, 0.10f), pants);
            Prim("L_Boot", PrimitiveType.Cube, lFoot, new Vector3(0, 0.03f, 0.07f), new Vector3(0.12f, 0.11f, 0.26f), boot);
            Prim("L_BootTop", PrimitiveType.Cylinder, lFoot, new Vector3(0, 0.14f, 0), new Vector3(0.11f, 0.08f, 0.11f), boot);
            Prim("R_Thigh", PrimitiveType.Capsule, body._rLegU, new Vector3(0, -0.21f, 0), new Vector3(0.13f, 0.21f, 0.13f), pants);
            Prim("R_Calf", PrimitiveType.Capsule, body._rLegL, new Vector3(0, -0.19f, 0), new Vector3(0.10f, 0.19f, 0.10f), pants);
            Prim("R_Boot", PrimitiveType.Cube, rFoot, new Vector3(0, 0.03f, 0.07f), new Vector3(0.12f, 0.11f, 0.26f), boot);
            Prim("R_BootTop", PrimitiveType.Cylinder, rFoot, new Vector3(0, 0.14f, 0), new Vector3(0.11f, 0.08f, 0.11f), boot);

            return body;
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
                // Default fishing hold: both hands in front of the chest, not hanging back.
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
                    hipPos = new Vector3(0, 0.52f, 0.04f);
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
            Hip.localRotation = Quaternion.Slerp(Hip.localRotation, hip, k);
            Hip.localPosition = Vector3.Lerp(Hip.localPosition, hipPos, k);
            _spine.localRotation = Quaternion.Slerp(_spine.localRotation, spine, k);
            _chest.localRotation = Quaternion.Slerp(_chest.localRotation, chest, k);
            if (_neck) _neck.localRotation = Quaternion.Slerp(_neck.localRotation, neck, k);
            if (_head) _head.localRotation = Quaternion.Slerp(_head.localRotation, head, k);
            _lU.localRotation = Quaternion.Slerp(_lU.localRotation, lU, k);
            _rU.localRotation = Quaternion.Slerp(_rU.localRotation, rU, k);
            _lL.localRotation = Quaternion.Slerp(_lL.localRotation, lL, k);
            _rL.localRotation = Quaternion.Slerp(_rL.localRotation, rL, k);
            _lLegU.localRotation = Quaternion.Slerp(_lLegU.localRotation, lLegU, k);
            _rLegU.localRotation = Quaternion.Slerp(_rLegU.localRotation, rLegU, k);
            _lLegL.localRotation = Quaternion.Slerp(_lLegL.localRotation, lLegL, k);
            _rLegL.localRotation = Quaternion.Slerp(_rLegL.localRotation, rLegL, k);
        }

        static void ApplySitBase(ref Vector3 hipPos, ref Quaternion hip,
            ref Quaternion lLegU, ref Quaternion rLegU, ref Quaternion lLegL, ref Quaternion rLegL,
            ref Quaternion spine)
        {
            hipPos = new Vector3(0, 0.48f, 0.06f);
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

        static Transform Prim(string name, PrimitiveType type, Transform parent, Vector3 local, Vector3 scale, Material mat)
        {
            return MeshUtil.Prim(name, type, parent, local, scale, mat);
        }
    }
}
