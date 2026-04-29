Shader "Custom/TexturedVertexColor"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                float4 color : COLOR;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
                float4 color : COLOR;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _Color;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.color = v.color;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // Sample the texture
                fixed4 texColor = tex2D(_MainTex, i.uv);
                
                // If we have no texture, use vertex colors
                if (texColor.r == 1 && texColor.g == 1 && texColor.b == 1)
                    return i.color * _Color;
                    
                // If we have a texture but no vertex colors, use texture
                if (i.color.r == 0 && i.color.g == 0 && i.color.b == 0)
                    return texColor * _Color;
                    
                // If we have both, blend them
                return texColor * i.color * _Color;
            }
            ENDCG
        }
    }
}