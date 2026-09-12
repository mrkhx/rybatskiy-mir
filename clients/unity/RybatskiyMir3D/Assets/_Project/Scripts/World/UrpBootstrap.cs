using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace RybatskiyMir.World
{
    /// <summary>
    /// Makes sure a URP pipeline exists so Lit/custom shaders are not magenta
    /// when the project has no GraphicsSettings asset yet.
    /// </summary>
    public static class UrpBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Ensure()
        {
            if (GraphicsSettings.currentRenderPipeline != null) return;
            try
            {
                var renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
                renderer.name = "RM Universal Renderer";
                var asset = UniversalRenderPipelineAsset.Create(renderer);
                asset.shadowDistance = 78f;
                asset.msaaSampleCount = 2;
                GraphicsSettings.defaultRenderPipeline = asset;
                QualitySettings.renderPipeline = asset;
                QualitySettings.shadowDistance = 78f;
                QualitySettings.shadowCascades = QualityTier.SoftShadows ? 2 : 0;
                Debug.Log("[RybatskiyMir] Runtime URP pipeline created.");
            }
            catch (System.Exception e)
            {
                Debug.LogWarning("[RybatskiyMir] URP bootstrap failed: " + e.Message);
            }
        }
    }
}
