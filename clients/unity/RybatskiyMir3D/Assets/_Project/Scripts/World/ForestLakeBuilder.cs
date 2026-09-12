using UnityEngine;
using UnityEngine.Rendering;

namespace RybatskiyMir.World
{
    public static class ForestLakeBuilder
    {
        public static readonly Vector3 LakeCenter = new Vector3(0f, 0f, 16f);
        public const float LakeRadius = 15.5f;
        public const float WaterY = 0.18f;
        public static readonly Vector3 SpawnPos = new Vector3(0f, 0.42f, -7.4f);

        public static Transform SitPoint;
        public static Transform LookOut;
        public static Light Sun;
        public static Light Fill;

        public static GameObject Build(Transform root)
        {
            var world = new GameObject("ForestLakeWorld");
            world.transform.SetParent(root, false);

            BuildSkyDome(world.transform);
            BuildGround(world.transform);
            BuildWater(world.transform);
            BuildMist(world.transform);
            BuildShoreBlockers(world.transform);
            BuildPier(world.transform);
            Vegetation.Scatter(world.transform);
            Sun = BuildLights();
            return world;
        }

        static void BuildSkyDome(Transform parent)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = "SkyDome";
            go.transform.SetParent(parent, false);
            go.transform.localScale = Vector3.one * 360f;
            Object.Destroy(go.GetComponent<Collider>());
            var sunDir = Quaternion.Euler(38f, 128f, 0) * Vector3.forward;
            go.GetComponent<MeshRenderer>().sharedMaterial = MeshUtil.Sky(Palette.SkyDay, Palette.SkyZenith, sunDir);
            go.GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;
            go.GetComponent<MeshRenderer>().receiveShadows = false;
        }

        static void BuildGround(Transform parent)
        {
            var n = QualityTier.Current == QualityLevel.Low ? 48 : 72;
            var size = 108f;
            var mesh = MeshUtil.Grid(n, size, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                var wx = u * size;
                var wz = v * size;
                var dist = DistToLake(wx, wz);
                float h;
                if (dist < LakeRadius - 1.4f)
                    h = -2.15f + Mathf.PerlinNoise(x * 0.07f, z * 0.07f) * 0.25f;
                else if (dist < LakeRadius + 4.2f)
                {
                    var t = Mathf.InverseLerp(LakeRadius - 1.4f, LakeRadius + 4.2f, dist);
                    var shore = 0.18f + Mathf.PerlinNoise(x * 0.12f, z * 0.12f) * 0.22f;
                    h = Mathf.Lerp(-2.15f, shore, Smooth(t));
                }
                else
                    h = 0.22f
                        + Mathf.PerlinNoise(x * 0.09f, z * 0.09f) * 1.35f
                        + Mathf.PerlinNoise(x * 0.025f, z * 0.025f) * 3.1f
                        + Mathf.PerlinNoise(x * 0.22f, z * 0.22f) * 0.28f;

                if (IsPath(wx, wz) && dist > LakeRadius - 0.5f) h = 0.20f;
                return new Vector3(wx, h, wz);
            }, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                var wx = u * size;
                var wz = v * size;
                var dist = DistToLake(wx, wz);
                if (IsPath(wx, wz) && dist > LakeRadius - 0.8f) return Palette.Dirt;
                if (dist < LakeRadius + 0.6f) return Color.Lerp(Palette.Sand * 0.55f, Palette.Sand, Mathf.InverseLerp(LakeRadius - 3f, LakeRadius + 1f, dist));
                if (dist < LakeRadius + 5f) return Color.Lerp(Palette.Sand, Palette.Grass, Mathf.InverseLerp(LakeRadius + 0.6f, LakeRadius + 5f, dist));
                var moss = Mathf.PerlinNoise(x * 0.18f, z * 0.18f);
                return Color.Lerp(Palette.Grass, Palette.GrassDark, moss);
            });
            var mat = MeshUtil.Lit(Color.white, 0.08f, false, TextureFactory.Ground);
            MeshUtil.MeshObj("Terrain", mesh, mat, parent, Vector3.zero, true);
        }

        static bool IsPath(float wx, float wz) => Mathf.Abs(wx) < 2.15f && wz > -8.4f && wz < 1.2f;

        static float DistToLake(float wx, float wz) =>
            Vector2.Distance(new Vector2(wx, wz), new Vector2(LakeCenter.x, LakeCenter.z));

        static float Smooth(float t) => t * t * (3f - 2f * t);

        static void BuildWater(Transform parent)
        {
            var waterGo = new GameObject("Water");
            waterGo.transform.SetParent(parent, false);
            waterGo.AddComponent<LakeWater>().Build(WaterY);
        }

        static void BuildMist(Transform parent)
        {
            var mist = GameObject.CreatePrimitive(PrimitiveType.Quad);
            mist.name = "LakeMist";
            mist.transform.SetParent(parent, false);
            mist.transform.position = new Vector3(LakeCenter.x, WaterY + 0.55f, LakeCenter.z);
            mist.transform.rotation = Quaternion.Euler(90f, 0, 0);
            mist.transform.localScale = new Vector3(LakeRadius * 2.4f, LakeRadius * 2.4f, 1f);
            Object.Destroy(mist.GetComponent<Collider>());
            var m = MeshUtil.Unlit(new Color(0.78f, 0.86f, 0.88f, 0.10f));
            if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
            m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
            m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
            m.SetInt("_ZWrite", 0);
            m.renderQueue = 3100;
            m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            MeshUtil.ApplyColor(m, new Color(0.78f, 0.86f, 0.88f, 0.10f));
            var r = mist.GetComponent<MeshRenderer>();
            r.sharedMaterial = m;
            r.shadowCastingMode = ShadowCastingMode.Off;
        }

        static void BuildShoreBlockers(Transform parent)
        {
            var fence = new GameObject("ShoreFence");
            fence.transform.SetParent(parent, false);
            for (int i = 0; i < 20; i++)
            {
                var ang = i / 20f * Mathf.PI * 2f;
                // gap on the south bank for the pier approach (ang near -PI/2 relative to lake center)
                var dir = new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang));
                var p = LakeCenter + dir * (LakeRadius + 0.6f);
                p.y = 0.55f;
                if (p.z < 3.5f && Mathf.Abs(p.x) < 4.5f) continue;
                var box = GameObject.CreatePrimitive(PrimitiveType.Cube);
                box.name = "ShoreWall_" + i;
                box.transform.SetParent(fence.transform, false);
                box.transform.position = p;
                box.transform.LookAt(new Vector3(LakeCenter.x, 0.55f, LakeCenter.z));
                box.transform.localScale = new Vector3(6.4f, 1.3f, 0.35f);
                Object.Destroy(box.GetComponent<MeshRenderer>());
            }
        }

        static void BuildPier(Transform parent)
        {
            var dry = MeshUtil.Lit(Palette.PierDry, 0.14f, false, TextureFactory.Wood);
            var wet = MeshUtil.Lit(Palette.PierWet, 0.32f, false, TextureFactory.Wood);
            var rust = MeshUtil.Lit(new Color(0.30f, 0.24f, 0.18f), 0.1f, false, TextureFactory.Wood);
            var pier = new GameObject("OldBridge");
            pier.transform.SetParent(parent, false);
            pier.transform.position = new Vector3(0f, 0.46f, -0.85f);

            const int planks = 22;
            const float plankStep = 0.38f;
            for (int i = 0; i < 2; i++)
            {
                var beam = GameObject.CreatePrimitive(PrimitiveType.Cube);
                beam.name = "Stringer_" + i;
                beam.transform.SetParent(pier.transform, false);
                beam.transform.localPosition = new Vector3(i == 0 ? -0.58f : 0.58f, -0.05f, (planks - 1) * plankStep * 0.5f);
                beam.transform.localScale = new Vector3(0.12f, 0.12f, planks * plankStep + 0.3f);
                beam.GetComponent<MeshRenderer>().sharedMaterial = rust;
            }

            for (int i = 0; i < planks; i++)
            {
                var plank = GameObject.CreatePrimitive(PrimitiveType.Cube);
                plank.name = "Plank_" + i;
                plank.transform.SetParent(pier.transform, false);
                var wobble = Mathf.Sin(i * 1.7f) * 0.012f;
                var sag = i > 12 ? -0.012f * (i - 12) : 0f;
                plank.transform.localPosition = new Vector3(wobble, 0.07f + sag, i * plankStep);
                plank.transform.localRotation = Quaternion.Euler(0, (i % 3 - 1) * 0.45f, 0);
                plank.transform.localScale = new Vector3(1.92f, 0.065f, 0.34f);
                plank.GetComponent<MeshRenderer>().sharedMaterial = i > 12 ? wet : dry;
            }

            for (int k = 0; k < 4; k++)
            {
                var cross = GameObject.CreatePrimitive(PrimitiveType.Cube);
                cross.transform.SetParent(pier.transform, false);
                cross.transform.localPosition = new Vector3(0, -0.12f, 1.2f + k * 1.9f);
                cross.transform.localScale = new Vector3(1.35f, 0.07f, 0.08f);
                cross.GetComponent<MeshRenderer>().sharedMaterial = rust;
                Object.Destroy(cross.GetComponent<Collider>());
            }

            for (int s = 0; s < 2; s++)
            {
                var side = s == 0 ? -0.92f : 0.92f;
                for (int k = 0; k < 6; k++)
                {
                    var post = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    post.transform.SetParent(pier.transform, false);
                    post.transform.localPosition = new Vector3(side, 0.40f, 0.25f + k * 0.72f);
                    post.transform.localScale = new Vector3(0.07f, 0.58f, 0.07f);
                    post.GetComponent<MeshRenderer>().sharedMaterial = rust;
                }
                var rail = GameObject.CreatePrimitive(PrimitiveType.Cube);
                rail.transform.SetParent(pier.transform, false);
                rail.transform.localPosition = new Vector3(side, 0.66f, 2.05f);
                rail.transform.localScale = new Vector3(0.05f, 0.05f, 4.1f);
                rail.GetComponent<MeshRenderer>().sharedMaterial = rust;
                Object.Destroy(rail.GetComponent<Collider>());
            }

            for (int s = 0; s < 8; s++)
            {
                var side = s % 2 == 0 ? -0.72f : 0.72f;
                var z = 0.4f + (s / 2) * 2.45f;
                var pile = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                pile.name = "Pile_" + s;
                pile.transform.SetParent(pier.transform, false);
                pile.transform.localPosition = new Vector3(side, -0.85f, z);
                pile.transform.localScale = new Vector3(0.20f, 1.12f, 0.20f);
                pile.GetComponent<MeshRenderer>().sharedMaterial = z > 4f ? wet : dry;
            }

            var crate = GameObject.CreatePrimitive(PrimitiveType.Cube);
            crate.name = "TackleCrate";
            crate.transform.SetParent(pier.transform, false);
            crate.transform.localPosition = new Vector3(-0.62f, 0.22f, 1.1f);
            crate.transform.localScale = new Vector3(0.38f, 0.28f, 0.32f);
            crate.transform.localRotation = Quaternion.Euler(0, 12f, 0);
            crate.GetComponent<MeshRenderer>().sharedMaterial = dry;

            var sitZ = (planks - 3) * plankStep;
            var sit = new GameObject("SitPoint");
            sit.transform.SetParent(pier.transform, false);
            sit.transform.localPosition = new Vector3(0f, 0.10f, sitZ);
            sit.transform.localRotation = Quaternion.identity;
            SitPoint = sit.transform;

            var look = new GameObject("LookOut");
            look.transform.SetParent(pier.transform, false);
            look.transform.localPosition = new Vector3(0, 1.05f, sitZ + 3.4f);
            LookOut = look.transform;

            var prompt = new GameObject("InteractPrompt");
            prompt.transform.SetParent(sit.transform, false);
            prompt.transform.localPosition = new Vector3(0, 1.45f, 0);
            var tm = prompt.AddComponent<TextMesh>();
            tm.text = "Е  ·  ловить";
            tm.fontSize = 32;
            tm.characterSize = 0.055f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = new Color(0.92f, 0.93f, 0.88f);

            var trigger = pier.AddComponent<BoxCollider>();
            trigger.isTrigger = true;
            trigger.center = new Vector3(0, 0.55f, sitZ);
            trigger.size = new Vector3(2.3f, 2.1f, 3.2f);
        }

        static Light BuildLights()
        {
            var sun = new GameObject("Sun");
            var l = sun.AddComponent<Light>();
            l.type = LightType.Directional;
            l.color = Palette.SunDay;
            l.intensity = 1.18f;
            l.shadows = QualityTier.SoftShadows ? LightShadows.Soft : LightShadows.None;
            l.shadowStrength = 0.72f;
            l.shadowBias = 0.05f;
            l.shadowNormalBias = 0.4f;
            sun.transform.rotation = Quaternion.Euler(38f, 128f, 0);

            var fillGo = new GameObject("Fill");
            Fill = fillGo.AddComponent<Light>();
            Fill.type = LightType.Directional;
            Fill.color = new Color(0.55f, 0.68f, 0.78f);
            Fill.intensity = 0.16f;
            Fill.shadows = LightShadows.None;
            fillGo.transform.rotation = Quaternion.Euler(18f, -40f, 0);

            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.58f, 0.72f, 0.80f);
            RenderSettings.ambientEquatorColor = new Color(0.38f, 0.48f, 0.40f);
            RenderSettings.ambientGroundColor = new Color(0.16f, 0.14f, 0.10f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = Palette.FogDay;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = QualityTier.FogStart;
            RenderSettings.fogEndDistance = QualityTier.FogEnd;
            RenderSettings.subtractiveShadowColor = new Color(0.28f, 0.32f, 0.38f);
            QualitySettings.shadowDistance = 78f;
            return l;
        }
    }
}
