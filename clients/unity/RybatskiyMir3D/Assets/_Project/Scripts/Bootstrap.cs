using UnityEngine;

namespace RybatskiyMir
{
    public static class Bootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
#if UNITY_2023_1_OR_NEWER
            if (Object.FindAnyObjectByType<GameInstaller>() != null) return;
#else
            if (Object.FindObjectOfType<GameInstaller>() != null) return;
#endif
            var go = new GameObject("GameInstaller");
            Object.DontDestroyOnLoad(go);
            go.AddComponent<GameInstaller>();
        }
    }
}
