using RybatskiyMir.Fishing;
using RybatskiyMir.Input;
using UnityEngine;

namespace RybatskiyMir.Hud
{
    /// <summary>
    /// One compact prompt. Never world-space text over the fisherman.
    /// </summary>
    public class HudOverlay : MonoBehaviour
    {
        public FishingDirector Fishing;
        public PlayerInputReader Input;
        public bool NearSpot;
        Texture2D _px;

        void OnGUI()
        {
            if (_px == null)
            {
                _px = new Texture2D(1, 1, TextureFormat.RGBA32, false);
                _px.SetPixel(0, 0, Color.white);
                _px.Apply();
            }

            var pad = 16;
            GUI.color = new Color(0.06f, 0.12f, 0.14f, 0.55f);
            GUI.DrawTexture(new Rect(pad, pad, 268, 28), _px);
            GUI.color = new Color(0.93f, 0.95f, 0.90f);
            var title = new GUIStyle(GUI.skin.label) { fontSize = 13, fontStyle = FontStyle.Bold };
            GUI.Label(new Rect(pad + 8, pad + 4, 250, 22), "Лесное озеро  ·  Старый мостик", title);

            if (Input != null && !Input.PointerLocked)
            {
                Chip(Screen.width / 2 - 90, 16, 180, 26, "ЛКМ — камера");
            }

            if (Fishing == null) return;

            if (NearSpot && !Fishing.Active)
            {
                Chip(Screen.width / 2 - 72, Screen.height - 54, 144, 28, "E   ловить");
            }

            if (!Fishing.Active) return;

            var h = 48;
            GUI.color = new Color(0.06f, 0.10f, 0.12f, 0.72f);
            GUI.DrawTexture(new Rect(0, Screen.height - h, Screen.width, h), _px);
            GUI.color = Color.white;
            var st = new GUIStyle(GUI.skin.label) { fontSize = 13, alignment = TextAnchor.MiddleLeft };
            GUI.Label(new Rect(18, Screen.height - h + 6, Screen.width - 36, 20), Fishing.Status ?? "", st);

            var t = Fishing.Tension;
            GUI.color = new Color(0.15f, 0.22f, 0.22f, 0.9f);
            GUI.DrawTexture(new Rect(18, Screen.height - 16, 200, 6), _px);
            GUI.color = Color.Lerp(new Color(0.45f, 0.78f, 0.55f), new Color(0.86f, 0.32f, 0.22f), t);
            GUI.DrawTexture(new Rect(18, Screen.height - 16, 200 * Mathf.Clamp01(t), 6), _px);
            GUI.color = Color.white;
            var small = new GUIStyle(GUI.skin.label) { fontSize = 11 };
            GUI.Label(new Rect(226, Screen.height - 22, 120, 16), "натяжение", small);
        }

        void Chip(float x, float y, float w, float h, string text)
        {
            GUI.color = new Color(0.05f, 0.10f, 0.12f, 0.72f);
            GUI.DrawTexture(new Rect(x, y, w, h), _px);
            GUI.color = new Color(0.93f, 0.94f, 0.90f);
            var st = new GUIStyle(GUI.skin.label) { fontSize = 13, alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
            GUI.Label(new Rect(x, y, w, h), text, st);
            GUI.color = Color.white;
        }
    }
}
