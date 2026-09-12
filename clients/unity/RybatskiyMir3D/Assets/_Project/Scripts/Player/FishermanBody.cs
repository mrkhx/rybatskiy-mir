using UnityEngine;

namespace RybatskiyMir.Player
{
    public enum FishermanPose
    {
        Idle, Walk, Run, Sit, Aim, Cast, Wait, Hook, Fight, Land
    }

    /// <summary>
    /// Stylized humanoid built at runtime (art-bible palette).
    /// Placeholder until SK_Fisherman + animset. Not a capsule, not a mannequin.
    /// </summary>
    public class FishermanBody : MonoBehaviour
    {
        public FishermanPose Pose = FishermanPose.Idle;
        public float MoveSpeed;
        public float CastT;
        public float Tension;
        public Transform RightHand { get; private set; }
        public Transform Hip { get; private set; }

        Transform _spine, _chest, _head;
        Transform _lU, _lL, _rU, _rL;
        Transform _lLegU, _lLegL, _rLegU, _rLegL;
        Vector3 _hipRest;
        float _phase;

        public static FishermanBody Build(Transform root)
        {
            var jacket = MeshUtilColor(new Color(0.31f, 0.36f, 0.23f), 0.18f);
            var vest = MeshUtilColor(new Color(0.24f, 0.28f, 0.16f), 0.16f);
            var pants = MeshUtilColor(new Color(0.22f, 0.22f, 0.18f), 0.12f);
            var boot = MeshUtilColor(new Color(0.12f, 0.16f, 0.11f), 0.2f);
            var skin = MeshUtilColor(new Color(0.79f, 0.63f, 0.48f), 0.28f);
            var cap = MeshUtilColor(new Color(0.42f, 0.34f, 0.22f), 0.14f);
            var shirt = MeshUtilColor(new Color(0.38f, 0.34f, 0.28f), 0.14f);

            var body = root.gameObject.AddComponent<FishermanBody>();
            var rig = new GameObject("Rig");
            rig.transform.SetParent(root, false);

            body.Hip = Bone("Hip", rig.transform, new Vector3(0, 0.92f, 0));
            body._hipRest = body.Hip.localPosition;
            Prim("Hips", PrimitiveType.Cube, body.Hip, new Vector3(0, -0.02f, 0), new Vector3(0.32f, 0.16f, 0.2f), pants);

            body._spine = Bone("Spine", body.Hip, new Vector3(0, 0.16f, 0));
            body._chest = Bone("Chest", body._spine, new Vector3(0, 0.22f, 0.02f));
            Prim("Jacket", PrimitiveType.Cube, body._chest, new Vector3(0, 0.08f, 0), new Vector3(0.42f, 0.46f, 0.26f), jacket);
            Prim("Vest", PrimitiveType.Cube, body._chest, new Vector3(0, 0.04f, 0.04f), new Vector3(0.28f, 0.38f, 0.16f), vest);
            Prim("Collar", PrimitiveType.Cube, body._chest, new Vector3(0, 0.28f, 0.02f), new Vector3(0.3f, 0.08f, 0.22f), jacket);

            body._head = Bone("Head", body._chest, new Vector3(0, 0.38f, 0.02f));
            Prim("Skull", PrimitiveType.Sphere, body._head, Vector3.zero, Vector3.one * 0.22f, skin);
            var capT = Prim("Cap", PrimitiveType.Cylinder, body._head, new Vector3(0, 0.1f, 0), new Vector3(0.2f, 0.045f, 0.2f), cap);
            Prim("Brim", PrimitiveType.Cylinder, capT, new Vector3(0, -0.6f, 0.35f), new Vector3(1.15f, 0.12f, 1.35f), cap);

            var lClav = Bone("L_Clav", body._chest, new Vector3(-0.22f, 0.22f, 0));
            var rClav = Bone("R_Clav", body._chest, new Vector3(0.22f, 0.22f, 0));
            body._lU = Bone("L_UpperArm", lClav, new Vector3(-0.05f, -0.04f, 0));
            body._lL = Bone("L_LowerArm", body._lU, new Vector3(0, -0.28f, 0));
            Bone("L_Hand", body._lL, new Vector3(0, -0.24f, 0));
            body._rU = Bone("R_UpperArm", rClav, new Vector3(0.05f, -0.04f, 0));
            body._rL = Bone("R_LowerArm", body._rU, new Vector3(0, -0.28f, 0));
            body.RightHand = Bone("R_Hand", body._rL, new Vector3(0, -0.24f, 0));

            Prim("L_UArmM", PrimitiveType.Capsule, body._lU, new Vector3(0, -0.14f, 0), new Vector3(0.09f, 0.14f, 0.09f), jacket);
            Prim("L_LArmM", PrimitiveType.Capsule, body._lL, new Vector3(0, -0.12f, 0), new Vector3(0.07f, 0.12f, 0.07f), shirt);
            Prim("L_HandM", PrimitiveType.Sphere, body._lL, new Vector3(0, -0.24f, 0), Vector3.one * 0.07f, skin);
            Prim("R_UArmM", PrimitiveType.Capsule, body._rU, new Vector3(0, -0.14f, 0), new Vector3(0.09f, 0.14f, 0.09f), jacket);
            Prim("R_LArmM", PrimitiveType.Capsule, body._rL, new Vector3(0, -0.12f, 0), new Vector3(0.07f, 0.12f, 0.07f), shirt);
            Prim("R_HandM", PrimitiveType.Sphere, body.RightHand, Vector3.zero, Vector3.one * 0.07f, skin);

            body._lLegU = Bone("L_UpperLeg", body.Hip, new Vector3(-0.1f, -0.08f, 0));
            body._lLegL = Bone("L_LowerLeg", body._lLegU, new Vector3(0, -0.4f, 0));
            var lFoot = Bone("L_Foot", body._lLegL, new Vector3(0, -0.38f, 0.04f));
            body._rLegU = Bone("R_UpperLeg", body.Hip, new Vector3(0.1f, -0.08f, 0));
            body._rLegL = Bone("R_LowerLeg", body._rLegU, new Vector3(0, -0.4f, 0));
            var rFoot = Bone("R_Foot", body._rLegL, new Vector3(0, -0.38f, 0.04f));

            Prim("L_Thigh", PrimitiveType.Capsule, body._lLegU, new Vector3(0, -0.2f, 0), new Vector3(0.12f, 0.2f, 0.12f), pants);
            Prim("L_Calf", PrimitiveType.Capsule, body._lLegL, new Vector3(0, -0.18f, 0), new Vector3(0.1f, 0.18f, 0.1f), pants);
            Prim("L_Boot", PrimitiveType.Cube, lFoot, new Vector3(0, 0.02f, 0.06f), new Vector3(0.12f, 0.1f, 0.24f), boot);
            Prim("R_Thigh", PrimitiveType.Capsule, body._rLegU, new Vector3(0, -0.2f, 0), new Vector3(0.12f, 0.2f, 0.12f), pants);
            Prim("R_Calf", PrimitiveType.Capsule, body._rLegL, new Vector3(0, -0.18f, 0), new Vector3(0.1f, 0.18f, 0.1f), pants);
            Prim("R_Boot", PrimitiveType.Cube, rFoot, new Vector3(0, 0.02f, 0.06f), new Vector3(0.12f, 0.1f, 0.24f), boot);

            return body;
        }

        void LateUpdate()
        {
            var dt = Time.deltaTime;
            _phase += dt * (Pose == FishermanPose.Run ? 10f : 7.2f);
            var walk = Mathf.Clamp01(MoveSpeed / 3.2f);
            var run = Mathf.Clamp01((MoveSpeed - 3.2f) / 2.4f);

            Quaternion hip = Quaternion.identity;
            Quaternion spine = Quaternion.identity;
            Quaternion chest = Quaternion.identity;
            Vector3 hipPos = _hipRest;
            Quaternion lU = Quaternion.Euler(0, 0, 8);
            Quaternion rU = Quaternion.Euler(0, 0, -8);
            Quaternion lL = Quaternion.identity;
            Quaternion rL = Quaternion.identity;
            Quaternion lLegU = Quaternion.identity;
            Quaternion rLegU = Quaternion.identity;
            Quaternion lLegL = Quaternion.identity;
            Quaternion rLegL = Quaternion.identity;

            if (Pose is FishermanPose.Idle or FishermanPose.Walk or FishermanPose.Run)
            {
                var amp = Mathf.Lerp(6f, 28f, walk) + run * 10f;
                var swing = Mathf.Sin(_phase) * amp;
                lLegU = Quaternion.Euler(swing, 0, 0);
                rLegU = Quaternion.Euler(-swing, 0, 0);
                lLegL = Quaternion.Euler(-Mathf.Max(0, swing) * 0.7f, 0, 0);
                rLegL = Quaternion.Euler(-Mathf.Max(0, -swing) * 0.7f, 0, 0);
                lU = Quaternion.Euler(-swing * 0.7f, 0, 10);
                rU = Quaternion.Euler(swing * 0.7f, 0, -10);
                hip = Quaternion.Euler(0, swing * 0.15f, 0);
                spine = Quaternion.Euler(walk * 4f + Mathf.Sin(Time.time * 1.4f) * 1.2f, 0, 0);
                hipPos.y += Mathf.Abs(Mathf.Sin(_phase * 2f)) * walk * 0.03f;
                if (walk < 0.05f)
                {
                    spine = Quaternion.Euler(Mathf.Sin(Time.time * 1.5f) * 1.5f, 0, 0);
                    lU = Quaternion.Euler(8f, 0, 12f);
                    rU = Quaternion.Euler(8f, 0, -12f);
                }
            }
            else if (Pose == FishermanPose.Sit || Pose == FishermanPose.Aim || Pose == FishermanPose.Wait)
            {
                hipPos = new Vector3(0, 0.58f, 0.05f);
                hip = Quaternion.Euler(12f, 0, 0);
                lLegU = Quaternion.Euler(-82f, -8f, 0);
                rLegU = Quaternion.Euler(-82f, 8f, 0);
                lLegL = Quaternion.Euler(78f, 0, 0);
                rLegL = Quaternion.Euler(78f, 0, 0);
                spine = Quaternion.Euler(18f, 0, 0);
                chest = Quaternion.Euler(6f, 0, 0);
                lU = Quaternion.Euler(-28f, 18f, 28f);
                lL = Quaternion.Euler(-20f, 0, 0);
                rU = Quaternion.Euler(-48f, -12f, -18f);
                rL = Quaternion.Euler(-8f, 0, 0);
                if (Pose == FishermanPose.Aim)
                {
                    rU = Quaternion.Euler(-70f, -8f, -10f);
                    chest = Quaternion.Euler(10f, 8f, 0);
                }
            }
            else if (Pose == FishermanPose.Cast)
            {
                hipPos = new Vector3(0, 0.58f, 0.05f);
                hip = Quaternion.Euler(12f, 0, 0);
                lLegU = Quaternion.Euler(-82f, -8f, 0);
                rLegU = Quaternion.Euler(-82f, 8f, 0);
                lLegL = Quaternion.Euler(78f, 0, 0);
                rLegL = Quaternion.Euler(78f, 0, 0);
                var t = Mathf.Clamp01(CastT);
                float back = t < 0.4f ? t / 0.4f : 1f - (t - 0.4f) / 0.6f * 1.4f;
                back = Mathf.Clamp01(back);
                float fwd = t < 0.4f ? 0 : Mathf.Clamp01((t - 0.4f) / 0.2f);
                rU = Quaternion.Euler(Mathf.Lerp(40f, -110f, back) + fwd * -20f, -10f, -12f);
                rL = Quaternion.Euler(Mathf.Lerp(0f, -20f, fwd), 0, 0);
                chest = Quaternion.Euler(Mathf.Lerp(8f, -12f, back) + fwd * 18f, fwd * 10f, 0);
                spine = Quaternion.Euler(14f, 0, 0);
                lU = Quaternion.Euler(-20f, 20f, 24f);
            }
            else if (Pose == FishermanPose.Hook)
            {
                hipPos = new Vector3(0, 0.58f, 0.05f);
                hip = Quaternion.Euler(8f, 0, 0);
                lLegU = Quaternion.Euler(-82f, -8f, 0);
                rLegU = Quaternion.Euler(-82f, 8f, 0);
                lLegL = Quaternion.Euler(78f, 0, 0);
                rLegL = Quaternion.Euler(78f, 0, 0);
                rU = Quaternion.Euler(-95f, -6f, -8f);
                chest = Quaternion.Euler(-8f, 0, 0);
                spine = Quaternion.Euler(6f, 0, 0);
            }
            else if (Pose == FishermanPose.Fight)
            {
                hipPos = new Vector3(0, 0.58f, 0.05f);
                var yank = Mathf.Sin(Time.time * (2.2f + Tension * 3f)) * (8f + Tension * 14f);
                hip = Quaternion.Euler(10f, yank * 0.4f, 0);
                lLegU = Quaternion.Euler(-78f, -10f, 0);
                rLegU = Quaternion.Euler(-86f, 10f, 0);
                lLegL = Quaternion.Euler(74f, 0, 0);
                rLegL = Quaternion.Euler(80f, 0, 0);
                rU = Quaternion.Euler(-55f + yank, -14f, -16f);
                rL = Quaternion.Euler(-10f, 0, 0);
                lU = Quaternion.Euler(-40f + yank * 0.4f, 16f, 22f);
                chest = Quaternion.Euler(12f + yank * 0.3f, yank * 0.5f, 0);
                spine = Quaternion.Euler(16f, 0, 0);
            }
            else if (Pose == FishermanPose.Land)
            {
                hipPos = new Vector3(0, 0.62f, 0.05f);
                hip = Quaternion.Euler(8f, 0, 0);
                lLegU = Quaternion.Euler(-70f, -8f, 0);
                rLegU = Quaternion.Euler(-70f, 8f, 0);
                lLegL = Quaternion.Euler(64f, 0, 0);
                rLegL = Quaternion.Euler(64f, 0, 0);
                rU = Quaternion.Euler(-20f, -30f, -8f);
                lU = Quaternion.Euler(-18f, 28f, 10f);
                chest = Quaternion.Euler(10f, 0, 0);
            }

            float k = 1f - Mathf.Exp(-12f * dt);
            Hip.localRotation = Quaternion.Slerp(Hip.localRotation, hip, k);
            Hip.localPosition = Vector3.Lerp(Hip.localPosition, hipPos, k);
            _spine.localRotation = Quaternion.Slerp(_spine.localRotation, spine, k);
            _chest.localRotation = Quaternion.Slerp(_chest.localRotation, chest, k);
            _lU.localRotation = Quaternion.Slerp(_lU.localRotation, lU, k);
            _rU.localRotation = Quaternion.Slerp(_rU.localRotation, rU, k);
            _lL.localRotation = Quaternion.Slerp(_lL.localRotation, lL, k);
            _rL.localRotation = Quaternion.Slerp(_rL.localRotation, rL, k);
            _lLegU.localRotation = Quaternion.Slerp(_lLegU.localRotation, lLegU, k);
            _rLegU.localRotation = Quaternion.Slerp(_rLegU.localRotation, rLegU, k);
            _lLegL.localRotation = Quaternion.Slerp(_lLegL.localRotation, lLegL, k);
            _rLegL.localRotation = Quaternion.Slerp(_rLegL.localRotation, rLegL, k);
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
            return World.MeshUtil.Prim(name, type, parent, local, scale, mat);
        }

        static Material MeshUtilColor(Color c, float s) => World.MeshUtil.Lit(c, s);
    }
}
