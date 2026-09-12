using UnityEngine;

namespace RybatskiyMir.World
{
    public static class Vegetation
    {
        static Mesh _cone, _grass;
        static Material _trunkM, _barkBirch, _needleA, _needleB, _needleFar, _leafBirch, _reedM, _reedHead, _bladeM, _bushM, _rockM;

        static void EnsureMats()
        {
            if (_cone != null) return;
            _cone = MeshUtil.Cone(1f, 1f, 10);
            _grass = MeshUtil.GrassCard();
            _trunkM = MeshUtil.Lit(Palette.Trunk, 0.08f, false, TextureFactory.Bark);
            _barkBirch = MeshUtil.Lit(Palette.Birch, 0.12f, false, TextureFactory.Bark);
            _needleA = MeshUtil.Lit(Palette.NeedleA, 0.06f);
            _needleB = MeshUtil.Lit(Palette.NeedleB, 0.06f);
            _needleFar = MeshUtil.Lit(Palette.FarForest, 0.04f);
            _leafBirch = MeshUtil.Lit(new Color(0.42f, 0.52f, 0.28f), 0.08f);
            _reedM = MeshUtil.Lit(Palette.Reed, 0.05f);
            _reedHead = MeshUtil.Lit(Palette.ReedHead, 0.08f);
            _bladeM = MeshUtil.Foliage(Color.white, TextureFactory.Blade, 0.55f);
            _bushM = MeshUtil.Lit(new Color(0.24f, 0.36f, 0.18f), 0.07f);
            _rockM = MeshUtil.Lit(Palette.Rock, 0.14f, false, TextureFactory.Noise);
        }

        public static void Scatter(Transform parent)
        {
            EnsureMats();
            ScatterNearTrees(parent);
            ScatterDistant(parent);
            ScatterReeds(parent);
            ScatterGrass(parent);
            ScatterBushes(parent);
            ScatterRocks(parent);
            ScatterLilies(parent);
            ScatterSnags(parent);
            ScatterRoots(parent);
            ScatterSaplings(parent);
        }

        static void ScatterNearTrees(Transform parent)
        {
            var rng = new System.Random(17);
            int count = QualityTier.TreeCount;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var rad = ForestLakeBuilder.ShoreRadius(
                    ForestLakeBuilder.LakeCenter.x + Mathf.Cos(ang) * (ForestLakeBuilder.LakeRadius + 8f),
                    ForestLakeBuilder.LakeCenter.z + Mathf.Sin(ang) * (ForestLakeBuilder.LakeRadius + 8f));
                rad += 4.5f + (float)rng.NextDouble() * 22f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, 0, Mathf.Sin(ang) * rad);
                if (p.z < 2f && Mathf.Abs(p.x) < 5.5f) continue;
                p.y = 0.05f;
                var kind = rng.NextDouble();
                if (kind < 0.12) Sapling(parent, p, rng, i);
                else if (kind < 0.30) Birch(parent, p, rng, i);
                else if (kind < 0.55) Spruce(parent, p, rng, i);
                else Pine(parent, p, rng, i, false);
            }
        }

        static void ScatterDistant(Transform parent)
        {
            var rng = new System.Random(91);
            int count = QualityTier.DistantTreeCount;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var rad = 38f + (float)rng.NextDouble() * 22f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, 0.05f, Mathf.Sin(ang) * rad);
                Pine(parent, p, rng, 1000 + i, true);
            }
        }

        static void Pine(Transform parent, Vector3 p, System.Random rng, int i, bool far)
        {
            var tree = new GameObject((far ? "FarPine_" : "Pine_") + i);
            tree.transform.SetParent(parent, false);
            tree.transform.SetPositionAndRotation(p, Quaternion.Euler(0, rng.Next(0, 360), (float)(rng.NextDouble() - 0.5) * 4f));
            tree.AddComponent<WindSway>().Amount = far ? 1.2f : 2.2f;
            var h = far ? 7f + (float)rng.NextDouble() * 4f : 5.2f + (float)rng.NextDouble() * 3.8f;
            var trunkR = far ? 0.28f : 0.18f + (float)rng.NextDouble() * 0.12f;
            var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.transform.SetParent(tree.transform, false);
            trunk.transform.localScale = new Vector3(trunkR * 2f, h * 0.48f, trunkR * 2f);
            trunk.transform.localPosition = new Vector3(0, h * 0.48f, 0);
            trunk.GetComponent<MeshRenderer>().sharedMaterial = _trunkM;
            if (far) Object.Destroy(trunk.GetComponent<Collider>());
            int layers = far ? 3 : 4 + rng.Next(0, 2);
            for (int L = 0; L < layers; L++)
            {
                var y = h * 0.32f + L * (h * 0.18f);
                var s = (layers - L) * (far ? 1.15f : 0.82f) + 0.55f;
                var mat = far ? _needleFar : (L % 2 == 0 ? _needleA : _needleB);
                MeshUtil.MeshChild("Needles_" + L, _cone, tree.transform, new Vector3(0, y, 0), new Vector3(s, h * 0.30f, s), mat);
            }
        }

        static void Spruce(Transform parent, Vector3 p, System.Random rng, int i)
        {
            var tree = new GameObject("Spruce_" + i);
            tree.transform.SetParent(parent, false);
            tree.transform.position = p;
            tree.transform.rotation = Quaternion.Euler(0, rng.Next(0, 360), 0);
            tree.AddComponent<WindSway>().Amount = 2.0f;
            var h = 6.4f + (float)rng.NextDouble() * 3.2f;
            var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.transform.SetParent(tree.transform, false);
            trunk.transform.localScale = new Vector3(0.28f, h * 0.5f, 0.28f);
            trunk.transform.localPosition = new Vector3(0, h * 0.5f, 0);
            trunk.GetComponent<MeshRenderer>().sharedMaterial = _trunkM;
            for (int L = 0; L < 6; L++)
            {
                var y = h * 0.22f + L * (h * 0.13f);
                var s = (6 - L) * 0.42f + 0.35f;
                MeshUtil.MeshChild("Needles_" + L, _cone, tree.transform, new Vector3(0, y, 0), new Vector3(s, h * 0.18f, s), L % 2 == 0 ? _needleB : _needleA);
            }
        }

        static void Birch(Transform parent, Vector3 p, System.Random rng, int i)
        {
            var tree = new GameObject("Birch_" + i);
            tree.transform.SetParent(parent, false);
            tree.transform.position = p;
            tree.AddComponent<WindSway>().Amount = 1.8f;
            var h = 5.4f + (float)rng.NextDouble() * 2.4f;
            var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.transform.SetParent(tree.transform, false);
            trunk.transform.localScale = new Vector3(0.22f, h * 0.5f, 0.22f);
            trunk.transform.localPosition = new Vector3(0, h * 0.5f, 0);
            trunk.GetComponent<MeshRenderer>().sharedMaterial = _barkBirch;
            for (int b = 0; b < 4; b++)
            {
                var band = GameObject.CreatePrimitive(PrimitiveType.Cube);
                band.transform.SetParent(trunk.transform, false);
                band.transform.localPosition = new Vector3(0, -0.6f + b * 0.35f, 0);
                band.transform.localScale = new Vector3(1.05f, 0.04f, 1.05f);
                band.GetComponent<MeshRenderer>().sharedMaterial = MeshUtil.Lit(Palette.BirchMark, 0.1f);
                Object.Destroy(band.GetComponent<Collider>());
            }
            for (int L = 0; L < 3; L++)
            {
                var canopy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                canopy.transform.SetParent(tree.transform, false);
                canopy.transform.localPosition = new Vector3((L - 1) * 0.45f, h * 0.78f + (L % 2) * 0.3f, (L - 1) * 0.2f);
                canopy.transform.localScale = Vector3.one * (1.6f - L * 0.15f);
                canopy.GetComponent<MeshRenderer>().sharedMaterial = _leafBirch;
                Object.Destroy(canopy.GetComponent<Collider>());
            }
        }

        static void ScatterReeds(Transform parent)
        {
            var rng = new System.Random(9);
            int count = QualityTier.ReedCount;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var probe = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang)) * (ForestLakeBuilder.LakeRadius + 4f);
                var rad = ForestLakeBuilder.ShoreRadius(probe.x, probe.z) - 1.2f + (float)rng.NextDouble() * 3.4f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, ForestLakeBuilder.WaterY - 0.05f, Mathf.Sin(ang) * rad);
                if (Mathf.Abs(p.x) < 2.2f && p.z < 10f) continue;
                var cluster = new GameObject("Reed_" + i);
                cluster.transform.SetParent(parent, false);
                cluster.transform.position = p;
                cluster.AddComponent<WindSway>().Amount = 5.5f;
                int blades = 4 + rng.Next(0, 4);
                for (int b = 0; b < blades; b++)
                {
                    var r = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    r.transform.SetParent(cluster.transform, false);
                    var h = 1.15f + (float)rng.NextDouble() * 0.85f;
                    r.transform.localPosition = new Vector3((float)(rng.NextDouble() - 0.5) * 0.32f, h * 0.5f, (float)(rng.NextDouble() - 0.5) * 0.32f);
                    r.transform.localScale = new Vector3(0.03f, h, 0.03f);
                    r.transform.localRotation = Quaternion.Euler((float)rng.NextDouble() * 10f, rng.Next(0, 180), (float)rng.NextDouble() * 12f - 6f);
                    r.GetComponent<MeshRenderer>().sharedMaterial = _reedM;
                    Object.Destroy(r.GetComponent<Collider>());
                    if (rng.NextDouble() > 0.45)
                    {
                        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                        head.transform.SetParent(r.transform, false);
                        head.transform.localPosition = new Vector3(0, 0.52f, 0);
                        head.transform.localScale = new Vector3(1.4f, 0.12f, 1.4f);
                        head.GetComponent<MeshRenderer>().sharedMaterial = _reedHead;
                        Object.Destroy(head.GetComponent<Collider>());
                    }
                }
            }
        }

        static void ScatterGrass(Transform parent)
        {
            var rng = new System.Random(33);
            int count = QualityTier.GrassCount;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var probe = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang)) * (ForestLakeBuilder.LakeRadius + 6f);
                var rad = ForestLakeBuilder.ShoreRadius(probe.x, probe.z) + 0.8f + (float)rng.NextDouble() * 10f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, 0.02f, Mathf.Sin(ang) * rad);
                if (p.z < 1.5f && Mathf.Abs(p.x) < 3f) continue;
                var go = new GameObject("Grass_" + i);
                go.transform.SetParent(parent, false);
                go.transform.position = p;
                go.transform.rotation = Quaternion.Euler(0, rng.Next(0, 360), 0);
                var s = 0.45f + (float)rng.NextDouble() * 0.55f;
                go.transform.localScale = new Vector3(s, 0.35f + (float)rng.NextDouble() * 0.45f, s);
                go.AddComponent<MeshFilter>().sharedMesh = _grass;
                var r = go.AddComponent<MeshRenderer>();
                r.sharedMaterial = _bladeM;
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
        }

        static void ScatterBushes(Transform parent)
        {
            var rng = new System.Random(44);
            int count = QualityTier.BushCount;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var probe = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang)) * (ForestLakeBuilder.LakeRadius + 6f);
                var rad = ForestLakeBuilder.ShoreRadius(probe.x, probe.z) + 2f + (float)rng.NextDouble() * 8f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, 0.12f, Mathf.Sin(ang) * rad);
                if (Mathf.Abs(p.x) < 3.5f && p.z < 3f) continue;
                var bush = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                bush.name = "Bush_" + i;
                bush.transform.SetParent(parent, false);
                bush.transform.position = p;
                bush.transform.localScale = new Vector3(
                    1.1f + (float)rng.NextDouble() * 0.8f,
                    0.7f + (float)rng.NextDouble() * 0.4f,
                    1.0f + (float)rng.NextDouble() * 0.7f);
                bush.GetComponent<MeshRenderer>().sharedMaterial = _bushM;
                Object.Destroy(bush.GetComponent<Collider>());
            }
        }

        static void ScatterRocks(Transform parent)
        {
            var rng = new System.Random(4);
            for (int i = 0; i < 18; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var probe = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang)) * (ForestLakeBuilder.LakeRadius + 4f);
                var rad = ForestLakeBuilder.ShoreRadius(probe.x, probe.z) - 0.4f + (float)rng.NextDouble() * 5f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, 0.08f, Mathf.Sin(ang) * rad);
                var rock = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                rock.name = "Rock_" + i;
                rock.transform.SetParent(parent, false);
                rock.transform.position = p;
                rock.transform.localScale = new Vector3(
                    0.45f + (float)rng.NextDouble() * 1.2f,
                    0.22f + (float)rng.NextDouble() * 0.38f,
                    0.4f + (float)rng.NextDouble() * 1.0f);
                rock.transform.rotation = Quaternion.Euler(rng.Next(0, 35), rng.Next(0, 360), rng.Next(0, 25));
                rock.GetComponent<MeshRenderer>().sharedMaterial = _rockM;
            }
        }

        static void ScatterLilies(Transform parent)
        {
            var padM = MeshUtil.Lit(new Color(0.20f, 0.42f, 0.22f), 0.32f);
            var flowerM = MeshUtil.Lit(new Color(0.90f, 0.86f, 0.72f), 0.4f);
            var rng = new System.Random(21);
            for (int i = 0; i < 16; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var rad = 5f + (float)rng.NextDouble() * (ForestLakeBuilder.LakeRadius - 6f);
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, ForestLakeBuilder.WaterY + 0.02f, Mathf.Sin(ang) * rad);
                if (Mathf.Abs(p.x) < 2.0f && p.z < 9f) continue;
                var pad = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                pad.name = "Lily_" + i;
                pad.transform.SetParent(parent, false);
                pad.transform.position = p;
                pad.transform.localScale = new Vector3(0.5f + (float)rng.NextDouble() * 0.35f, 0.01f, 0.5f);
                pad.GetComponent<MeshRenderer>().sharedMaterial = padM;
                Object.Destroy(pad.GetComponent<Collider>());
                if (rng.NextDouble() > 0.5)
                {
                    var fl = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    fl.transform.SetParent(pad.transform, false);
                    fl.transform.localPosition = new Vector3(0, 2.2f, 0);
                    fl.transform.localScale = new Vector3(0.22f, 0.2f, 0.22f);
                    fl.GetComponent<MeshRenderer>().sharedMaterial = flowerM;
                    Object.Destroy(fl.GetComponent<Collider>());
                }
            }
        }

        static void ScatterSnags(Transform parent)
        {
            var wood = MeshUtil.Lit(new Color(0.22f, 0.16f, 0.10f), 0.08f, false, TextureFactory.Bark);
            Vector3[] spots =
            {
                ForestLakeBuilder.LakeCenter + new Vector3(-7.2f, 0.08f, -8.5f),
                ForestLakeBuilder.LakeCenter + new Vector3(8.4f, 0.06f, -6.2f),
                ForestLakeBuilder.LakeCenter + new Vector3(-9.5f, 0.07f, 4.5f)
            };
            for (int i = 0; i < spots.Length; i++)
            {
                var log = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                log.name = "Snag_" + i;
                log.transform.SetParent(parent, false);
                log.transform.position = spots[i];
                log.transform.rotation = Quaternion.Euler(6f, 24f + i * 48f, 82f);
                log.transform.localScale = new Vector3(0.24f, 1.55f, 0.24f);
                log.GetComponent<MeshRenderer>().sharedMaterial = wood;
            }
        }

        static void Sapling(Transform parent, Vector3 p, System.Random rng, int i)
        {
            var tree = new GameObject("Sapling_" + i);
            tree.transform.SetParent(parent, false);
            tree.transform.SetPositionAndRotation(p, Quaternion.Euler(0, rng.Next(0, 360), (float)(rng.NextDouble() - 0.5) * 8f));
            tree.AddComponent<WindSway>().Amount = 3.4f;
            var h = 1.7f + (float)rng.NextDouble() * 1.4f;
            var trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.transform.SetParent(tree.transform, false);
            trunk.transform.localScale = new Vector3(0.12f, h * 0.45f, 0.12f);
            trunk.transform.localPosition = new Vector3(0, h * 0.45f, 0);
            trunk.GetComponent<MeshRenderer>().sharedMaterial = _trunkM;
            Object.Destroy(trunk.GetComponent<Collider>());
            for (int L = 0; L < 2; L++)
            {
                var y = h * 0.42f + L * (h * 0.28f);
                var s = (2 - L) * 0.55f + 0.35f;
                MeshUtil.MeshChild("Needles_" + L, _cone, tree.transform, new Vector3(0, y, 0), new Vector3(s, h * 0.32f, s), L == 0 ? _needleA : _needleB);
            }
        }

        static void ScatterSaplings(Transform parent)
        {
            var rng = new System.Random(61);
            int count = QualityTier.Current == QualityLevel.Low ? 4 : 10;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var probe = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang)) * (ForestLakeBuilder.LakeRadius + 6f);
                var rad = ForestLakeBuilder.ShoreRadius(probe.x, probe.z) + 1.4f + (float)rng.NextDouble() * 5f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, 0.04f, Mathf.Sin(ang) * rad);
                if (p.z < 2f && Mathf.Abs(p.x) < 5.5f) continue;
                Sapling(parent, p, rng, 2000 + i);
            }
        }

        static void ScatterRoots(Transform parent)
        {
            var wood = MeshUtil.Lit(new Color(0.28f, 0.20f, 0.12f), 0.08f, false, TextureFactory.Bark);
            var rng = new System.Random(5);
            int count = QualityTier.Current == QualityLevel.Low ? 5 : 10;
            for (int i = 0; i < count; i++)
            {
                var ang = (float)rng.NextDouble() * Mathf.PI * 2f;
                var probe = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang), 0, Mathf.Sin(ang)) * (ForestLakeBuilder.LakeRadius + 4f);
                var rad = ForestLakeBuilder.ShoreRadius(probe.x, probe.z) + 0.4f;
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Mathf.Cos(ang) * rad, 0.06f, Mathf.Sin(ang) * rad);
                if (Mathf.Abs(p.x) < 2.4f && p.z < 4f) continue;
                var root = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                root.name = "Root_" + i;
                root.transform.SetParent(parent, false);
                root.transform.position = p;
                root.transform.rotation = Quaternion.Euler(8f + rng.Next(0, 16), rng.Next(0, 360), 78f + rng.Next(0, 18));
                root.transform.localScale = new Vector3(0.08f + (float)rng.NextDouble() * 0.06f, 0.7f + (float)rng.NextDouble() * 0.5f, 0.08f);
                root.GetComponent<MeshRenderer>().sharedMaterial = wood;
                Object.Destroy(root.GetComponent<Collider>());
            }
        }
    }
}
