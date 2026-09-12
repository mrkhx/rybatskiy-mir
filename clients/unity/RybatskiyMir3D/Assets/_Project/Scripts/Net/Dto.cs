using System;
using Newtonsoft.Json;

namespace RybatskiyMir.Net
{
    [Serializable]
    public class TokenResponse
    {
        public string accessToken;
    }

    [Serializable]
    public class PlayerDto
    {
        public string id;
        public string nickname;
        public bool nicknameSet;
        public PlayerStatsDto stats;
    }

    [Serializable]
    public class PlayerStatsDto
    {
        public int level;
        public int xp;
        public int coins;
        public string title;
    }

    [Serializable]
    public class SessionDto
    {
        public string id;
        public string state;
        public string spotId;
        public string method;
        public string speciesId;
        public int? weightG;
        public int? lengthCm;
        public string tier;
        public float tension;
        public float fishStamina;
        public float lineIntegrity;
        public float fightProgress;
        public string biteAt;
        public string loseReason;
        public float? depthM;
        public string retrieve;
        public string playerHint;
    }

    [Serializable]
    public class WorldDto
    {
        public ClockDto clock;
        public WaterbodyDto waterbody;
    }

    [Serializable]
    public class ClockDto
    {
        public string timeOfDay;
        public string weather;
        public string season;
        public float temperatureC;
    }

    [Serializable]
    public class WaterbodyDto
    {
        public string name;
        public SpotDto[] spots;
    }

    [Serializable]
    public class SpotDto
    {
        public string id;
        public string name;
        public string kind;
        public bool secret;
        public string[] methods;
        public float depthMinM;
        public float depthMaxM;
    }

    [Serializable]
    public class CastRequest
    {
        public float force;
        public float direction;
        public float depthM;
        public string retrieve;
    }

    [Serializable]
    public class TickRequest
    {
        public float reel;
        public float rodPressure;
        public float rodDir;
        public float drag;
    }

    [Serializable]
    public class StartRequest
    {
        public string spotId;
        public string method;
    }

    public static class Json
    {
        public static readonly JsonSerializerSettings Settings = new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            MissingMemberHandling = MissingMemberHandling.Ignore
        };

        public static T Parse<T>(string raw) => JsonConvert.DeserializeObject<T>(raw, Settings);
        public static string Dump(object o) => JsonConvert.SerializeObject(o, Settings);
    }
}
