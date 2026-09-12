using UnityEditor;
using UnityEngine;

namespace RybatskiyMir.Editor
{
    /// <summary>
    /// Forces the authored fisherman FBX to import as a Humanoid avatar
    /// and writes PF_Fisherman.prefab the first time the model is imported.
    /// </summary>
    public class FishermanImport : AssetPostprocessor
    {
        void OnPreprocessModel()
        {
            if (assetPath.IndexOf("/Characters/Fisherman/") < 0) return;
            if (!assetPath.EndsWith(".fbx") && !assetPath.EndsWith(".FBX")) return;
            var imp = (ModelImporter)assetImporter;
            // Inspector label is "Humanoid"; the enum value is Human.
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.globalScale = 1f;
            imp.useFileScale = true;
            imp.addCollider = false;
            imp.importBlendShapes = false;
            imp.meshCompression = ModelImporterMeshCompression.Off;
            imp.isReadable = false;
        }

        static void OnPostprocessAllAssets(
            string[] imported, string[] deleted, string[] moved, string[] movedFrom)
        {
            foreach (var path in imported)
            {
                if (path.IndexOf("/Characters/Fisherman/") < 0) continue;
                if (!path.EndsWith("SM_Fisherman.fbx") && !path.EndsWith("SM_Fisherman_LOD0.fbx"))
                    continue;
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (model == null) continue;
                var prefabDir = "Assets/_Project/Characters/Fisherman/Prefabs";
                if (!AssetDatabase.IsValidFolder(prefabDir))
                    AssetDatabase.CreateFolder("Assets/_Project/Characters/Fisherman", "Prefabs");
                var prefabPath = prefabDir + "/PF_Fisherman.prefab";
                if (AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath) != null) continue;
                var inst = Object.Instantiate(model);
                inst.name = "PF_Fisherman";
                PrefabUtility.SaveAsPrefabAsset(inst, prefabPath);
                Object.DestroyImmediate(inst);
            }
        }
    }
}
