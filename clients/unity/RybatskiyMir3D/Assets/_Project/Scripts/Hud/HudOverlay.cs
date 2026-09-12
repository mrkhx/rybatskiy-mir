using RybatskiyMir.Fishing;
using RybatskiyMir.Input;
using RybatskiyMir.World;
using UnityEngine;

namespace RybatskiyMir.Hud
{
    /// <summary>
    /// One compact prompt. Never world-space text over the fisherman.
    /// Fishing HUD sits on the bottom edge.
    /// </summary>
    public class HudOverlay : MonoBehaviour
    {
        public FishingDirector Fishing;
        public PlayerInputReader Input;
        public Atmosphere Atmo;
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
            GUI.DrawTexture(new Rect(pad, pad, 280, 28), _px);
            GUI.color = new Color(0.93f, 0.95f, 0.90f);
            var title = new GUIStyle(GUI.skin.label) { fontSize = 13, fontStyle = FontStyle.Bold };
            GUI.Label(new Rect(pad + 8, pad + 4, 264, 22), "Лесное озеро  ·  Старый мостик", title);

            if (Input != null && !Input.PointerLocked)
                Chip(Screen.width / 2 - 90, 16, 180, 26, "ЛКМ — камера");

            if (Fishing == null) return;

            if (NearSpot && !Fishing.Active)
                Chip(Screen.width / 2 - 72, Screen.height - 54, 144, 28, "E   ловить");

            DrawTouchHints();

            if (!Fishing.Active) return;

            var h = 72;
            GUI.color = new Color(0.06f, 0.10f, 0.12f, 0.76f);
            GUI.DrawTexture(new Rect(0, Screen.height - h, Screen.width, h), _px);
            GUI.color = Color.white;
            var st = new GUIStyle(GUI.skin.label) { fontSize = 13, alignment = TextAnchor.MiddleLeft };
            GUI.Label(new Rect(18, Screen.height - h + 6, Screen.width - 36, 20), Fishing.Status ?? "", st);

            var meta = new GUIStyle(GUI.skin.label) { fontSize = 11 };
            GUI.color = new Color(0.78f, 0.84f, 0.80f);
            var weather = Atmo ? Atmo.Weather : "CLEAR";
            var tod = Atmo ? Atmo.TimeOfDay : "DAY";
            var methodRaw = Fishing.Session?.method;
            var method = string.IsNullOrEmpty(methodRaw) || methodRaw == "FLOAT" ? "поплавок" : methodRaw;
            var depth = Fishing.Session?.depthM ?? Fishing.DepthM;
            GUI.Label(new Rect(18, Screen.height - 44, 520, 16),
                $"{method}  ·  глубина {depth:0.0} м  ·  {WeatherRu(weather)}  ·  {TimeRu(tod)}", meta);
            GUI.color = Color.white;

            var t = Fishing.Tension;
            GUI.color = new Color(0.15f, 0.22f, 0.22f, 0.9f);
            GUI.DrawTexture(new Rect(18, Screen.height - 18, 200, 6), _px);
            GUI.color = Color.Lerp(new Color(0.45f, 0.78f, 0.55f), new Color(0.86f, 0.32f, 0.22f), t);
            GUI.DrawTexture(new Rect(18, Screen.height - 18, 200 * Mathf.Clamp01(t), 6), _px);
            GUI.color = Color.white;
            GUI.Label(new Rect(226, Screen.height - 24, 80, 16), "натяжение", meta);

            var drag = Fishing.Session?.fightProgress ?? 0f;
            if (drag > 0.001f || (Fishing.Session != null && Fishing.Session.state is "HOOKED" or "FIGHTING"))
            {
                GUI.color = new Color(0.15f, 0.22f, 0.22f, 0.9f);
                GUI.DrawTexture(new Rect(320, Screen.height - 18, 140, 6), _px);
                GUI.color = new Color(0.55f, 0.72f, 0.82f);
                GUI.DrawTexture(new Rect(320, Screen.height - 18, 140 * Mathf.Clamp01(drag), 6), _px);
                GUI.color = Color.white;
                GUI.Label(new Rect(466, Screen.height - 24, 80, 16), "вываживание", meta);
            }
        }

        void DrawTouchHints()
        {
            if (Input == null) return;
#if ENABLE_INPUT_SYSTEM
            if (UnityEngine.InputSystem.Touchscreen.current == null) return;
            GUI.color = new Color(1, 1, 1, 0.12f);
            GUI.DrawTexture(new Rect(Screen.width * 0.08f, Screen.height * 0.12f, Screen.height * 0.18f, Screen.height * 0.18f), _px);
            GUI.color = Color.white;
#endif
        }

        static string WeatherRu(string w) => w switch
        {
            "RAIN" => "дождь",
            "THUNDERSTORM" or "STORM" or "DOWNPOUR" => "гроза",
            "FOG" or "MIST" => "туман",
            "CLOUDY" or "OVERCAST" => "облачно",
            _ => "ясно"
        };

        static string TimeRu(string t) => t switch
        {
            "EVENING" or "DAWN" => "вечер",
            "NIGHT" or "DUSK" => "ночь",
            _ => "день"
        };

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
