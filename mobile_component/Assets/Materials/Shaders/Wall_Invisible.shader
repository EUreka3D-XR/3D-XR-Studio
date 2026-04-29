Shader "Custom/InvisibleWall"
{
    SubShader
    {
        Tags { "Queue" = "Geometry-1" }
        ColorMask 0  // Non renderizza nulla
        ZWrite On
        Stencil
        {
            Ref 1
            Comp Always
            Pass Replace  // Scrive il valore 1 nello stencil buffer
        }
        Pass {}
    }
}