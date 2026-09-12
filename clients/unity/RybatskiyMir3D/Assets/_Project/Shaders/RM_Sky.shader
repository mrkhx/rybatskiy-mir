Shader "RybatskiyMir/Sky"
{
    Properties
    {
        _Horizon ("Horizon", Color) = (0.77, 0.86, 0.90, 1)
        _Zenith ("Zenith", Color) = (0.16, 0.38, 0.55, 1)
        _SunColor ("Sun", Color) = (1, 0.93, 0.78, 1)
        _SunDir ("Sun Dir", Vector) = (0.35, 0.72, -0.45, 0)
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Background" "RenderType"="Background" }
        Pass
        {
            ZWrite Off
            ZTest LEqual
            Cull Front
            Fog { Mode Off }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _Horizon;
                half4 _Zenith;
                half4 _SunColor;
                float4 _SunDir;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 dir : TEXCOORD0; };

            Varyings vert(Attributes input)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                o.dir = TransformObjectToWorldDir(input.positionOS.xyz);
                return o;
            }

            half4 frag(Varyings i) : SV_Target
            {
                float3 d = normalize(i.dir);
                float h = saturate(d.y * 0.72 + 0.28);
                half3 col = lerp(_Horizon.rgb, _Zenith.rgb, pow(h, 0.85));
                float3 sun = normalize(_SunDir.xyz);
                float sunDot = saturate(dot(d, sun));
                col += _SunColor.rgb * pow(sunDot, 96.0) * 1.35;
                col += _SunColor.rgb * pow(sunDot, 6.0) * 0.18;
                return half4(col, 1);
            }
            ENDHLSL
        }
    }
    FallBack Off
}
