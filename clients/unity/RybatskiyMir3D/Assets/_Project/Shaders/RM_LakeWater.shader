Shader "RybatskiyMir/LakeWater"
{
    Properties
    {
        [MainColor] _ShallowColor ("Shallow", Color) = (0.31, 0.64, 0.66, 0.62)
        _DeepColor ("Deep", Color) = (0.05, 0.22, 0.27, 0.88)
        _FoamColor ("Foam", Color) = (0.84, 0.91, 0.93, 0.55)
        _Smoothness ("Smoothness", Range(0,1)) = 0.92
        _Amplitude ("Amplitude", Float) = 0.042
        _Speed ("Speed", Float) = 0.62
        _LakeCenter ("Lake Center", Vector) = (0,16,0,15.5)
        _Rain ("Rain", Range(0,1)) = 0
        _Ripple ("Ripple", Range(0,1)) = 0
        _RippleOrigin ("Ripple Origin", Vector) = (0,0,0,0)
        _Wind ("Wind", Range(0,2)) = 0.45
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Transparent" "Queue"="Transparent" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Back
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _ShallowColor;
                half4 _DeepColor;
                half4 _FoamColor;
                half _Smoothness;
                float _Amplitude;
                float _Speed;
                float4 _LakeCenter;
                float _Rain;
                float _Ripple;
                float4 _RippleOrigin;
                float _Wind;
            CBUFFER_END

            float4 _RMWindDir;

            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; };
            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float fogFactor : TEXCOORD2;
                float dist : TEXCOORD3;
            };

            float Wave(float3 p, float t)
            {
                float2 wd = _RMWindDir.xz;
                if (dot(wd, wd) < 0.01) wd = float2(1.0, 0.4);
                wd = normalize(wd);
                float wgt = 0.55 + _Wind * 0.45;
                float w = sin(p.x * 0.22 + t) * 0.55;
                w += cos(p.z * 0.17 + t * 1.18) * 0.45;
                w += sin((p.x + p.z) * 0.51 + t * 1.7) * 0.22;
                w += sin(dot(p.xz, wd) * 0.9 + t * 1.4) * 0.16 * wgt;
                w += sin(p.x * 1.4 + p.z * 1.1 + t * 2.4) * 0.08 * (0.35 + _Rain);
                w += sin(p.x * 3.2 + p.z * 2.6 + t * 3.1) * 0.035 * wgt;
                if (_Ripple > 0.001)
                {
                    float d = distance(p.xz, _RippleOrigin.xz);
                    w += sin(d * 9.0 - t * 8.0) * _Ripple * 0.35 * saturate(1.0 - d * 0.12);
                }
                return w * _Amplitude * (0.85 + _Wind * 0.25);
            }

            Varyings vert(Attributes input)
            {
                Varyings o;
                float3 posWS = TransformObjectToWorld(input.positionOS.xyz);
                float t = _Time.y * _Speed;
                float e = 0.28;
                float y = Wave(posWS, t);
                float yx = Wave(posWS + float3(e, 0, 0), t);
                float yz = Wave(posWS + float3(0, 0, e), t);
                posWS.y += y;
                float3 dx = float3(e, yx - y, 0);
                float3 dz = float3(0, yz - y, e);
                o.normalWS = normalize(cross(dz, dx));
                o.positionWS = posWS;
                o.positionCS = TransformWorldToHClip(posWS);
                o.fogFactor = ComputeFogFactor(o.positionCS.z);
                o.dist = distance(posWS.xz, _LakeCenter.xz);
                return o;
            }

            half4 frag(Varyings i) : SV_Target
            {
                float3 n = normalize(i.normalWS);
                float3 viewDir = GetWorldSpaceNormalizeViewDir(i.positionWS);
                Light mainLight = GetMainLight();

                float radius = max(_LakeCenter.w, 1.0);
                float deep = saturate((radius - i.dist) / max(radius * 0.72, 1.0));
                half4 col = lerp(_ShallowColor, _DeepColor, deep);

                half ndv = saturate(dot(n, viewDir));
                half fresnel = pow(1.0h - ndv, 3.4h);
                half3 sky = lerp(half3(0.62, 0.78, 0.82), half3(0.34, 0.54, 0.68), n.y * 0.5 + 0.5);
                col.rgb = lerp(col.rgb, sky, fresnel * 0.62h);

                float shore = saturate(1.0 - (radius + 1.8 - i.dist) * 0.45);
                col.rgb = lerp(col.rgb, _FoamColor.rgb, shore * 0.38h * (0.55h + 0.45h * sin(i.positionWS.x * 3.0 + _Time.y)));

                float3 halfDir = normalize(mainLight.direction + viewDir);
                half spec = pow(saturate(dot(n, halfDir)), 36.0h + _Smoothness * 90.0h);
                col.rgb += mainLight.color * spec * _Smoothness * 0.85h;

                float sparkle = pow(saturate(dot(n, halfDir)), 220.0h) * (0.35 + _Wind);
                col.rgb += sparkle * mainLight.color;

                col.rgb = lerp(col.rgb, col.rgb * half3(0.55, 0.72, 0.70), (1.0h - ndv) * 0.18h);

                if (_Rain > 0.05)
                {
                    float spark = frac(sin(dot(floor(i.positionWS.xz * 7.0 + _Time.y * 9.0), float2(12.9, 78.2))) * 43758.5);
                    col.rgb += spark * spark * _Rain * 0.12;
                    col.a = lerp(col.a, 0.92, _Rain * 0.2);
                    col.rgb = lerp(col.rgb, col.rgb * 0.82, _Rain * 0.25);
                }

                col.rgb = MixFog(col.rgb, i.fogFactor);
                return col;
            }
            ENDHLSL
        }
    }
    FallBack Off
}
