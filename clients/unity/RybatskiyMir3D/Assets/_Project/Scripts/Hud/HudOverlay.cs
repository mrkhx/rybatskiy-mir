using RybatskiyMir.Fishing;
using RybatskiyMir.Input;
using UnityEngine;

namespace RybatskiyMir.Hud
{
    /// <summary>
    /// Compact overlay. Explore = almost empty. Fishing = bottom strip, not 40% of the frame.
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

            var pad = 18;
            GUI.color = new Color(0.06f, 0.12f, 0.14f, 0.62f);
            GUI.DrawTexture(new Rect(pad, pad, 292, 36), _px);
            GUI.color = new Color(0.93f, 0.95f, 0.90f);
            var title = new GUIStyle(GUI.skin.label) { fontSize = 15, fontStyle = FontStyle.Bold };
            GUI.Label(new Rect(pad + 10, pad + 6, 270, 24), "Лесное озеро  ·  Старый мостик", title);

            if (Input != null && !Input.PointerLocked)
            {
                DrawBar(Screen.width / 2 - 150, 18, 300, 32, "ЛКМ — вернуть камеру");
            }

            if (Fishing == null) return;

            if (NearSpot && !Fishing.Active)
            {
                DrawBar(Screen.width / 2 - 140, Screen.height - 64, 280, 36, "E  —  сесть на мостик");
            }

            if (!Fishing.Active) return;

            var h = 56;
            GUI.color = new Color(0.06f, 0.10f, 0.12f, 0.78f);
            GUI.DrawTexture(new Rect(0, Screen.height - h, Screen.width, h), _px);
            GUI.color = Color.white;
            var st = new GUIStyle(GUI.skin.label) { fontSize = 14, alignment = TextAnchor.MiddleLeft };
            GUI.Label(new Rect(20, Screen.height - h + 8, Screen.width - 40, 22), Fishing.Status ?? "", st);

            var t = Fishing.Tension;
            GUI.color = new Color(0.15f, 0.22f, 0.22f, 0.9f);
            GUI.DrawTexture(new Rect(20, Screen.height - 18, 220, 8), _px);
            GUI.color = Color.Lerp(new Color(0.45f, 0.78f, 0.55f), new Color(0.86f, 0.32f, 0.22f), t);
            GUI.DrawTexture(new Rect(20, Screen.height - 18, 220 * Mathf.Clamp01(t), 8), _px);
            GUI.color = Color.white;
            var small = new GUIStyle(GUI.skin.label) { fontSize = 11 };
            GUI.Label(new Rect(248, Screen.height - 24, 160, 18), "натяжение", small);
        }

        void DrawBar(float x, float y, float w, float h, string text)
        {
            GUI.color = new Color(0.06f, 0.12f, 0.14f, 0.8f);
            GUI.DrawTexture(new Rect(x, y, w, h), _px);
            GUI.color = Color.white;
            var st = new GUIStyle(GUI.skin.label) { fontSize = 15, alignment = TextAnchor.MiddleCenter };
            GUI.Label(new Rect(x, y, w, h), text, st);
        }
    }
}
