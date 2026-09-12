using System;
using System.Threading.Tasks;

namespace RybatskiyMir.Net
{
    public class AuthClient
    {
        readonly ApiClient _api;
        public AuthClient(ApiClient api) => _api = api;

        public async Task<string> DevLogin(string vkId, string nickname)
        {
            var res = await _api.Send<TokenResponse>("/auth/dev/session", "POST", new { vkId, nickname });
            _api.Token = res.accessToken;
            return res.accessToken;
        }
    }

    public class ProfileClient
    {
        readonly ApiClient _api;
        public ProfileClient(ApiClient api) => _api = api;
        public Task<PlayerDto> Me() => _api.Send<PlayerDto>("/players/me");
    }

    public class WorldClient
    {
        readonly ApiClient _api;
        public WorldClient(ApiClient api) => _api = api;
        public Task<WorldDto> Snapshot() => _api.Send<WorldDto>("/world");
    }

    public class FishingClient
    {
        readonly ApiClient _api;
        public FishingClient(ApiClient api) => _api = api;

        public Task<SessionDto> Get() => _api.Send<SessionDto>("/fishing/session");
        public Task<SessionDto> Start(string spotId, string method) =>
            _api.Send<SessionDto>("/fishing/start", "POST", new StartRequest { spotId = spotId, method = method });
        public Task<SessionDto> Cast(float force, float direction, float depthM, string retrieve = "even") =>
            _api.Send<SessionDto>("/fishing/cast", "POST", new CastRequest { force = force, direction = direction, depthM = depthM, retrieve = retrieve });
        public Task<SessionDto> Bite() => _api.Send<SessionDto>("/fishing/bite", "POST", new { });
        public Task<SessionDto> Hook(float timingMs) =>
            _api.Send<SessionDto>("/fishing/hook", "POST", new { timingMs });
        public Task<SessionDto> Tick(float reel, float rodPressure, float rodDir, float drag) =>
            _api.Send<SessionDto>("/fishing/tick", "POST", new TickRequest { reel = reel, rodPressure = rodPressure, rodDir = rodDir, drag = drag });
        public Task<SessionDto> Decide(bool keep) =>
            _api.Send<SessionDto>("/fishing/decide", "POST", new { keep });
        public Task<SessionDto> ReelIn() => _api.Send<SessionDto>("/fishing/reel-in", "POST", new { });
    }

    public class InventoryClient
    {
        readonly ApiClient _api;
        public InventoryClient(ApiClient api) => _api = api;
        public Task<string> Raw() => _api.Send<string>("/inventory");
    }

    public class EconomyClient
    {
        readonly ApiClient _api;
        public EconomyClient(ApiClient api) => _api = api;
    }

    /// <summary>
    /// Socket.IO client seam. Slice uses REST polling for bite/tick so Play Mode
    /// does not depend on a Socket.IO package. Wire BestHTTP / socket.io-client
    /// here: handshake auth.token = JWT, emit fishing:cast|hook|tick, on fishing:state.
    /// Native Windows/Android do not need CORS. WebGL would.
    /// </summary>
    public class RealtimeClient
    {
        public bool Connected { get; private set; }
        public event Action<SessionDto> State;
        public event Action<string> Disconnected;

        public void Connect(string url, string token)
        {
            Connected = false;
        }

        public void Cast(object payload) { }
        public void Hook(object payload) { }
        public void Tick(object payload) { }

        public void Disconnect()
        {
            Connected = false;
            Disconnected?.Invoke("stub");
        }
    }
}
