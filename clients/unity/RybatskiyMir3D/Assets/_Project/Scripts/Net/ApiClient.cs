using System;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

namespace RybatskiyMir.Net
{
    public class ApiClient
    {
        public string BaseUrl;
        public string Token;

        public async Task<T> Send<T>(string path, string method = "GET", object body = null)
        {
            var url = BaseUrl.TrimEnd('/') + path;
            using var req = new UnityWebRequest(url, method);
            req.downloadHandler = new DownloadHandlerBuffer();
            if (body != null)
            {
                var json = Json.Dump(body);
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
                req.SetRequestHeader("Content-Type", "application/json");
            }
            if (!string.IsNullOrEmpty(Token))
                req.SetRequestHeader("Authorization", "Bearer " + Token);
            var op = req.SendWebRequest();
            while (!op.isDone) await Task.Yield();
            if (req.responseCode >= 400)
                throw new Exception($"HTTP {req.responseCode}: {req.downloadHandler.text}");
            var text = req.downloadHandler.text;
            if (string.IsNullOrEmpty(text) || text == "null") return default;
            return Json.Parse<T>(text);
        }
    }
}
