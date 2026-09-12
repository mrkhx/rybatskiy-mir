using UnityEngine;

namespace RybatskiyMir.World
{
    public static class ForestLakeBuilder
    {
        public static Transform SitPoint;
        public static Transform LookOut;
        public static float WaterY = 0.12f;
        public static Light Sun;

        public static GameObject Build(Transform root)
        {
            var world = new GameObject("ForestLakeWorld");
            world.transform.SetParent(root, false);

            BuildSkyDome(world.transform);
            BuildGround(world.transform);
            BuildWater(world.transform);
            BuildShoreBlockers(world.transform);
            BuildPier(world.transform);
            ScatterPines(world.transform);
            ScatterReeds(world.transform);
            ScatterRocks(world.transform);
            ScatterLilies(world.transform);
            ScatterSnags(world.transform);
            Sun = BuildSun();
            return world;
        }

        static void BuildSkyDome(Transform parent)
        {
            var n = 24;
            var mesh = new Mesh { name = "sky" };
            var verts = new Vector3[(n + 1) * (n / 2 + 1)];
            var cols = new Color[verts.Length];
            var tris = new int[n * (n / 2) * 6];
            int vi = 0;
            for (int y = 0; y <= n / 2; y++)
            {
                var pitch = y / (float)(n / 2) * Mathf.PI * 0.5f;
                var py = Mathf.Sin(pitch);
                var pr = Mathf.Cos(pitch);
                var horizon = new Color(0.78f, 0.86f, 0.9f);
                var zenith = new Color(0.42f, 0.68f, 0.82f);
                for (int x = 0; x <= n; x++)
                {
                    var yaw = x / (float)n * Mathf.PI * 2f;
                    verts[vi] = new Vector3(Mathf.Cos(yaw) * pr, py, Mathf.Sin(yaw) * pr) * 180f;
                    cols[vi] = Color.Lerp(horizon, zenith, py);
                    vi++;
                }
            }
            int t = 0;
            int stride = n + 1;
            for (int y = 0; y < n / 2; y++)
            for (int x = 0; x < n; x++)
            {
                int i = y * stride + x;
                // inward (we sit inside the dome)
                tris[t++] = i;
                tris[t++] = i + 1;
                tris[t++] = i + stride;
                tris[t++] = i + 1;
                tris[t++] = i + stride + 1;
                tris[t++] = i + stride;
            }
            mesh.vertices = verts;
            mesh.colors = cols;
            mesh.triangles = tris;
            var mat = MeshUtil.Unlit(Color.white);
            MeshUtil.MeshObj("SkyDome", mesh, mat, parent, Vector3.zero);
        }

        static void BuildGround(Transform parent)
        {
            var n = 56;
            var size = 92f;
            var mesh = MeshUtil.Grid(n, size, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                var wx = u * size;
                var wz = v * size;
                var dist = new Vector2(wx, wz - 6f).magnitude;
                float h;
                if (dist < 17.5f) h = -1.7f;
                else if (dist < 23.5f) h = Mathf.Lerp(-1.7f, 0.16f, (dist - 17.5f) / 6f);
                else h = 0.22f + Mathf.PerlinNoise(x * 0.11f, z * 0.11f) * 1.65f + Mathf.PerlinNoise(x * 0.03f, z * 0.03f) * 2.4f;
                if (wz > 6 && wz < 14 && Mathf.Abs(wx) < 2.4f && dist > 20f) h = 0.16f;
                return new Vector3(wx, h, wz);
            }, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                var wx = u * size;
                var wz = v * size;
                var dist = new Vector2(wx, wz - 6f).magnitude;
                var sand = new Color(0.55f, 0.5f, 0.36f);
                var grass = new Color(0.27f, 0.38f, 0.22f);
                var dirt = new Color(0.32f, 0.26f, 0.18f);
                if (wz > 6 && wz < 14 && Mathf.Abs(wx) < 2.4f) return dirt;
                if (dist < 24f) return Color.Lerp(sand, grass, Mathf.InverseLerp(18f, 26f, dist));
                return Color.Lerp(grass, new Color(0.18f, 0.28f, 0.16f), Mathf.PerlinNoise(x * 0.2f, z * 0.2f));
            });
            var mat = MeshUtil.Lit(new Color(0.32f, 0.4f, 0.26f), 0.08f);
            MeshUtil.MeshObj("Terrain", mesh, mat, parent, Vector3.zero, true);
        }

        static void BuildWater(Transform parent)
        {
            var waterGo = new GameObject("Water");
            waterGo.transform.SetParent(parent, false);
            waterGo.AddComponent<LakeWater>().Build(WaterY);
        }

        static void BuildShoreBlockers(Transform parent)
        {
            var fence = new GameObject("ShoreFence");
            fence.transform.SetParent(parent, false);
            for (int i = 0; i < 18; i++)
            {
                var ang = i / 18f * Mathf.PI * 2f;
                // gap at +Z where the pier lives
                var deg = ang * Mathf.Rad2Deg;
                if (deg > 70 && deg < 110) continue;
                var rad = 19.2f;
                var p = new Vector3(Mathf.Cos(ang) * rad, 0.6f, Mathf.Sin(ang) * rad + 6f);
                var box = GameObject.CreatePrimitive(PrimitiveType.Cube);
                box.name = "ShoreWall_" + i;
                box.transform.SetParent(fence.transform, false);
                box.transform.position = p;
                box.transform.LookAt(new Vector3(0, 0.6f, 6f));
                box.transform.localScale = new Vector3(7.2f, 1.4f, 0.4f);
                Object.Destroy(box.GetComponent<MeshRenderer>());
            }
        }

        static void BuildPier(Transform parent)
        {
            var dry = MeshUtil.Lit(new Color(0.42f, 0.32f, 0.22f), 0.12f);
            var wet = MeshUtil.Lit(new Color(0.24f, 0.18f, 0.13f), 0.28f);
            var rust = MeshUtil.Lit(new Color(0.28f, 0.22f, 0.16f), 0.1f);
            var pier = new GameObject("OldBridge");
            pier.transform.SetParent(parent, false);
            pier.transform.position = new Vector3(0, 0.52f, 7.6f);

            for (int i = 0; i < 16; i++)
            {
                var plank = GameObject.CreatePrimitive(PrimitiveType.Cube);
                plank.name = "Plank_" + i;
                plank.transform.SetParent(pier.transform, false);
                var wobble = (i % 3 - 1) * 0.012f;
                plank.transform.localPosition = new Vector3(wobble, 0.08f, i * 0.40f);
                plank.transform.localRotation = Quaternion.Euler(0, (i % 2) * 0.6f, 0);
                plank.transform.localScale = new Vector3(1.78f, 0.07f, 0.36f);
                plank.GetComponent<MeshRenderer>().sharedMaterial = i > 9 ? wet : dry;
            }

            // side rails (broken, only first half)
            for (int s = 0; s < 2; s++)
            {
                var side = s == 0 ? -0.86f : 0.86f;
                for (int k = 0; k < 5; k++)
                {
                    var post = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    post.transform.SetParent(pier.transform, false);
                    post.transform.localPosition = new Vector3(side, 0.38f, 0.3f + k * 0.85f);
                    post.transform.localScale = new Vector3(0.07f, 0.55f, 0.07f);
                    post.GetComponent<MeshRenderer>().sharedMaterial = rust;
                }
                var rail = GameObject.CreatePrimitive(PrimitiveType.Cube);
                rail.transform.SetParent(pier.transform, false);
                rail.transform.localPosition = new Vector3(side, 0.62f, 1.9f);
                rail.transform.localScale = new Vector3(0.05f, 0.05f, 3.6f);
                rail.GetComponent<MeshRenderer>().sharedMaterial = rust;
                Object.Destroy(rail.GetComponent<Collider>());
            }

            for (int s = 0; s < 6; s++)
            {
                var post = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                post.name = "Pile_" + s;
                post.transform.SetParent(pier.transform, false);
                var side = s % 2 == 0 ? -0.74f : 0.74f;
                var z = 0.35f + (s / 2) * 2.55f;
                post.transform.localPosition = new Vector3(side, -0.95f, z);
                post.transform.localScale = new Vector3(0.18f, 1.05f, 0.18f);
                post.GetComponent<MeshRenderer>().sharedMaterial = wet;
            }

            var sit = new GameObject("SitPoint");
            sit.transform.SetParent(pier.transform, false);
            sit.transform.localPosition = new Vector3(0f, 0.12f, 5.1f);
            sit.transform.localRotation = Quaternion.identity;
            SitPoint = sit.transform;

            var look = new GameObject("LookOut");
            look.transform.SetParent(pier.transform, false);
            look.transform.localPosition = new Vector3(0, 1.15f, 8.4f);
            LookOut = look.transform;

            var prompt = new GameObject("Prompt");
            prompt.transform.SetParent(sit.transform, false);
            prompt.transform.localPosition = new Vector3(0, 1.55f, 0);
            var tm = prompt.AddComponent<TextMesh>();
            tm.text = "Е  ·  ловить";
            tm.fontSize = 32;
            tm.characterSize = 0.06f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = new Color(0.92f, 0.93f, 0.88f);
            prompt.name = "InteractPrompt";

            var trigger = pier.AddComponent<BoxCollider>();
            trigger.isTrigger = true;
            trigger.center = new Vector3(0, 0.6f, 5.1f);
            trigger.size = new Vector3(2.2f, 2.2f, 3.4f);
        }

        static void ScatterPines(Transform parent)
        {
            var trunkM = MeshUtil.Lit(new Color(0.29f, 0.22f, 0.16f), 0.08f);
            var needleA = MeshUtil.Lit(new Color(0.18f, 0.32f, 0.18f), 0.06f);
            var needleB = MeshUtil.Lit(new Color(0.14f, 0.26f, 0.16f), 0.06f);
            var cone = MeshUtil.Cone(1f, 1f, 8);
            var rng = new System.Random(17);
            int count = QualityTier.TreeCount;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2;
                var rad = 26f + (float)rng.NextDouble() * 30f;
                var p = new Vector3(Mathf.Cos(ang) * rad, 0.15f, Mathf.Sin(ang) * rad + 6f);
                if (p.z > 5 && p.z < 24 && Mathf.Abs(p.x) < 6) continue;
                var tree = new GameObject("Pine_" + i);
                tree.transform.SetParent(parent, false);
                tree.transform.position = p;
                tree.transform.rotation = Quaternion.Euler(0, rng.Next(0, 360), 0);
                var h = 4.2f + (float)rng.NextDouble() * 3.4f;
                var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                trunk.transform.SetParent(tree.transform, false);
                trunk.transform.localScale = new Vector3(0.22f + (float)rng.NextDouble() * 0.1f, h * 0.5f, 0.22f);
                trunk.transform.localPosition = new Vector3(0, h * 0.5f, 0);
                trunk.GetComponent<MeshRenderer>().sharedMaterial = trunkM;
                Object.Destroy(trunk.GetComponent<Collider>());
                int layers = 3 + rng.Next(0, 2);
                for (int L = 0; L < layers; L++)
                {
                    var y = h * 0.38f + L * (h * 0.22f);
                    var s = (layers - L) * 0.85f + 0.6f;
                    MeshUtil.MeshChild("Needles_" + L, cone, tree.transform, new Vector3(0, y, 0), new Vector3(s, h * 0.34f, s), L % 2 == 0 ? needleA : needleB);
                }
            }
        }

        static void ScatterReeds(Transform parent)
        {
            var reedM = MeshUtil.Lit(new Color(0.34f, 0.42f, 0.2f), 0.05f);
            var rng = new System.Random(9);
            int count = QualityTier.ReedCount;
            for (int i = 0; i < count; i++)
            {
                var x = (float)(rng.NextDouble() * 20 - 10);
                var z = 15.5f + (float)rng.NextDouble() * 9f;
                if (Mathf.Abs(x) < 1.5f) x += 2.6f * Mathf.Sign(x == 0 ? 1 : x);
                var cluster = new GameObject("Reed_" + i);
                cluster.transform.SetParent(parent, false);
                cluster.transform.position = new Vector3(x, 0.05f, z);
                int blades = 3 + rng.Next(0, 3);
                for (int b = 0; b < blades; b++)
                {
                    var r = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    r.transform.SetParent(cluster.transform, false);
                    r.transform.localPosition = new Vector3((float)(rng.NextDouble() - 0.5) * 0.25f, 0.7f, (float)(rng.NextDouble() - 0.5) * 0.25f);
                    r.transform.localScale = new Vector3(0.035f, 1.15f + (float)rng.NextDouble() * 0.7f, 0.035f);
                    r.transform.localRotation = Quaternion.Euler((float)rng.NextDouble() * 8f, rng.Next(0, 180), (float)rng.NextDouble() * 10f - 5f);
                    r.GetComponent<MeshRenderer>().sharedMaterial = reedM;
                    Object.Destroy(r.GetComponent<Collider>());
                }
            }
        }

        static void ScatterRocks(Transform parent)
        {
            var rockM = MeshUtil.Lit(new Color(0.38f, 0.36f, 0.32f), 0.12f);
            var rng = new System.Random(4);
            for (int i = 0; i < 14; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2;
                var rad = 18.5f + (float)rng.NextDouble() * 6f;
                var p = new Vector3(Mathf.Cos(ang) * rad, 0.12f, Mathf.Sin(ang) * rad + 6f);
                var rock = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                rock.name = "Rock_" + i;
                rock.transform.SetParent(parent, false);
                rock.transform.position = p;
                rock.transform.localScale = new Vector3(
                    0.5f + (float)rng.NextDouble() * 1.1f,
                    0.28f + (float)rng.NextDouble() * 0.4f,
                    0.45f + (float)rng.NextDouble() * 0.9f);
                rock.transform.rotation = Quaternion.Euler(rng.Next(0, 40), rng.Next(0, 360), rng.Next(0, 30));
                rock.GetComponent<MeshRenderer>().sharedMaterial = rockM;
            }
        }

        static void ScatterLilies(Transform parent)
        {
            var padM = MeshUtil.Lit(new Color(0.22f, 0.42f, 0.24f), 0.35f);
            var flowerM = MeshUtil.Lit(new Color(0.86f, 0.82f, 0.72f), 0.4f);
            var rng = new System.Random(21);
            for (int i = 0; i < 12; i++)
            {
                var x = (float)(rng.NextDouble() * 16 - 8);
                var z = 16f + (float)rng.NextDouble() * 7f;
                if (Mathf.Abs(x) < 1.4f) continue;
                var pad = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                pad.name = "Lily_" + i;
                pad.transform.SetParent(parent, false);
                pad.transform.position = new Vector3(x, WaterY + 0.015f, z);
                pad.transform.localScale = new Vector3(0.55f, 0.012f, 0.55f);
                pad.GetComponent<MeshRenderer>().sharedMaterial = padM;
                Object.Destroy(pad.GetComponent<Collider>());
                if (rng.NextDouble() > 0.45)
                {
                    var fl = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    fl.transform.SetParent(pad.transform, false);
                    fl.transform.localPosition = new Vector3(0, 1.8f, 0);
                    fl.transform.localScale = new Vector3(0.22f, 0.18f, 0.22f);
                    fl.GetComponent<MeshRenderer>().sharedMaterial = flowerM;
                    Object.Destroy(fl.GetComponent<Collider>());
                }
            }
        }

        static void ScatterSnags(Transform parent)
        {
            var wood = MeshUtil.Lit(new Color(0.22f, 0.16f, 0.1f), 0.08f);
            Vector3[] spots = { new Vector3(-6.5f, 0.1f, 14.5f), new Vector3(7.2f, 0.05f, 17.8f), new Vector3(-8.4f, 0.08f, 19.2f) };
            for (int i = 0; i < spots.Length; i++)
            {
                var log = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                log.name = "Snag_" + i;
                log.transform.SetParent(parent, false);
                log.transform.position = spots[i];
                log.transform.rotation = Quaternion.Euler(8f, 30f + i * 40f, 78f);
                log.transform.localScale = new Vector3(0.22f, 1.4f, 0.22f);
                log.GetComponent<MeshRenderer>().sharedMaterial = wood;
            }
        }

        static Light BuildSun()
        {
            var sun = new GameObject("Sun");
            var l = sun.AddComponent<Light>();
            l.type = LightType.Directional;
            l.color = new Color(1f, 0.95f, 0.82f);
            l.intensity = 1.12f;
            l.shadows = QualityTier.SoftShadows ? LightShadows.Soft : LightShadows.None;
            sun.transform.rotation = Quaternion.Euler(42f, 140f, 0);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.55f, 0.7f, 0.78f);
            RenderSettings.ambientEquatorColor = new Color(0.4f, 0.5f, 0.42f);
            RenderSettings.ambientGroundColor = new Color(0.18f, 0.16f, 0.12f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.62f, 0.74f, 0.76f);
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = QualityTier.FogDensity;
            return l;
        }
    }
}
