using Dummiesman;
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public class MTLLoader {
    public List<string> SearchPaths = new List<string>() { "%FileName%_Textures", string.Empty};

    private FileInfo _objFileInfo = null;

    /// <summary>
    /// The texture loading function. Overridable for stream loading purposes.
    /// </summary>
    /// <param name="path">The path supplied by the OBJ file, converted to OS path seperation</param>
    /// <param name="isNormalMap">Whether the loader is requesting we convert this into a normal map</param>
    /// <returns>Texture2D if found, or NULL if missing</returns>
    public virtual Texture2D TextureLoadFunction(string path, bool isNormalMap)
    {
        try {
            //find it
            foreach (var searchPath in SearchPaths)
            {
                try {
                    //replace varaibles and combine path
                    string processedPath = (_objFileInfo != null) ? searchPath.Replace("%FileName%", Path.GetFileNameWithoutExtension(_objFileInfo.Name)) 
                                                              : searchPath;
                    string filePath = Path.Combine(processedPath, path);

                    Debug.Log($"Trying to load texture from: {filePath}");

                    //return if exists
                    if (File.Exists(filePath))
                    {
                        Debug.Log($"Found texture at: {filePath}");
                        var tex = ImageLoader.LoadTexture(filePath);

                        if(isNormalMap)
                            tex = ImageUtils.ConvertToNormalMap(tex);

                        return tex;
                    }
                    
                    // Also try to find the texture in the same directory as the MTL
                    if (_objFileInfo != null) {
                        string mtlDirTexPath = Path.Combine(_objFileInfo.Directory.FullName, path);
                        if (File.Exists(mtlDirTexPath)) {
                            Debug.Log($"Found texture in MTL directory: {mtlDirTexPath}");
                            var tex = ImageLoader.LoadTexture(mtlDirTexPath);

                            if(isNormalMap)
                                tex = ImageUtils.ConvertToNormalMap(tex);

                            return tex;
                        }
                    }
                } catch (Exception e) {
                    Debug.LogWarning($"Error in search path: {e.Message}");
                    continue;
                }
            }

            // Try to load from basename without path (for Android)
            string baseName = Path.GetFileName(path);
            foreach (var searchPath in SearchPaths)
            {
                try {
                    string processedPath = (_objFileInfo != null) ? searchPath.Replace("%FileName%", Path.GetFileNameWithoutExtension(_objFileInfo.Name)) 
                                                             : searchPath;
                    string baseNamePath = Path.Combine(processedPath, baseName);
                    
                    if (File.Exists(baseNamePath))
                    {
                        Debug.Log($"Found texture using basename: {baseNamePath}");
                        var tex = ImageLoader.LoadTexture(baseNamePath);

                        if(isNormalMap)
                            tex = ImageUtils.ConvertToNormalMap(tex);

                        return tex;
                    }
                } catch (Exception e) {
                    Debug.LogWarning($"Error in basename search: {e.Message}");
                    continue;
                }
            }

            Debug.LogWarning($"Texture not found: {path}");
            //not found
            return null;
        } catch (Exception e) {
            Debug.LogError($"Error in TextureLoadFunction: {e.Message}");
            return null;
        }
    }

    private Texture2D TryLoadTexture(string texturePath, bool normalMap = false)
    {
        try {
            //swap directory seperator char
            texturePath = texturePath.Replace('\\', Path.DirectorySeparatorChar);
            texturePath = texturePath.Replace('/', Path.DirectorySeparatorChar);

            return TextureLoadFunction(texturePath, normalMap);
        } catch (Exception e) {
            Debug.LogError($"Error in TryLoadTexture: {e.Message}");
            return null;
        }
    }
    
    private int GetArgValueCount(string arg)
    {
        switch (arg)
        {
            case "-bm":
            case "-clamp":
            case "-blendu":
            case "-blendv":
            case "-imfchan":
            case "-texres":
                return 1;
            case "-mm":
                return 2;
            case "-o":
            case "-s":
            case "-t":
                return 3;
        }
        return -1;
    }

    private int GetTexNameIndex(string[] components)
    {
        for(int i=1; i < components.Length; i++)
        {
            var cmpSkip = GetArgValueCount(components[i]);
            if(cmpSkip < 0)
            {
                return i;
            }
            i += cmpSkip;
        }
        return -1;
    }

    private float GetArgValue(string[] components, string arg, float fallback = 1f)
    {
        string argLower = arg.ToLower();
        for(int i=1; i < components.Length - 1; i++)
        {
            var cmp = components[i].ToLower();
            if(argLower == cmp)
            {
                return OBJLoaderHelper.FastFloatParse(components[i+1]);
            }
        }
        return fallback;
    }

    private string GetTexPathFromMapStatement(string processedLine, string[] splitLine)
    {
        int texNameCmpIdx = GetTexNameIndex(splitLine);
        if(texNameCmpIdx < 0)
        {
            Debug.LogError($"texNameCmpIdx < 0 on line {processedLine}. Texture not loaded.");
            return null;
        }

        int texNameIdx = processedLine.IndexOf(splitLine[texNameCmpIdx]);
        string texturePath = processedLine.Substring(texNameIdx);

        return texturePath;
    }

    /// <summary>
    /// Loads a *.mtl file
    /// </summary>
    /// <param name="input">The input stream from the MTL file</param>
    /// <returns>Dictionary containing loaded materials</returns>
    public Dictionary<string, Material> Load(Stream input)
    {
        try {
            var inputReader = new StreamReader(input);
            var reader = new StringReader(inputReader.ReadToEnd());

            Dictionary<string, Material> mtlDict = new Dictionary<string, Material>();
            Material currentMaterial = null;

            for (string line = reader.ReadLine(); line != null; line = reader.ReadLine())
            {
                if (string.IsNullOrWhiteSpace(line))
                    continue;

                string processedLine = line.Clean();
                string[] splitLine = processedLine.Split(' ');

                //blank or comment
                if (splitLine.Length < 2 || processedLine[0] == '#')
                    continue;

                //newmtl
                if (splitLine[0] == "newmtl")
                {
                    string materialName = processedLine.Substring(7);

                    // Use Standard shader if Specular setup not available (common on Android)
                    Shader shader = Shader.Find("Standard (Specular setup)");
                    if (shader == null) {
                        shader = Shader.Find("Standard");
                        if (shader == null) {
                            Debug.LogWarning("Neither Standard Specular nor Standard shader found. Using fallback.");
                            shader = Shader.Find("Diffuse");
                        }
                    }
                    
                    var newMtl = new Material(shader) { name = materialName };
                    mtlDict[materialName] = newMtl;
                    currentMaterial = newMtl;

                    continue;
                }

                //anything past here requires a material instance
                if (currentMaterial == null)
                    continue;

                //diffuse color
                if (splitLine[0] == "Kd" || splitLine[0] == "kd")
                {
                    var currentColor = currentMaterial.GetColor("_Color");
                    var kdColor = OBJLoaderHelper.ColorFromStrArray(splitLine);

                    currentMaterial.SetColor("_Color", new Color(kdColor.r, kdColor.g, kdColor.b, currentColor.a));
                    continue;
                }

                //diffuse map
                if (splitLine[0] == "map_Kd" || splitLine[0] == "map_kd")
                {
                    string texturePath = GetTexPathFromMapStatement(processedLine, splitLine);
                    if(texturePath == null)
                    {
                        continue; //invalid args or sth
                    }

                    Debug.Log($"Loading diffuse texture: {texturePath}");
                    var KdTexture = TryLoadTexture(texturePath);
                    
                    if (KdTexture != null) {
                        Debug.Log($"Loaded diffuse texture: {texturePath} ({KdTexture.width}x{KdTexture.height})");
                        
                        // Check if using Standard (Specular setup) or Standard shader
                        if (currentMaterial.HasProperty("_MainTex")) {
                            currentMaterial.SetTexture("_MainTex", KdTexture);
                        }

                        //set transparent mode if the texture has transparency
                        if(KdTexture.format == TextureFormat.DXT5 || KdTexture.format == TextureFormat.ARGB32)
                        {
                            OBJLoaderHelper.EnableMaterialTransparency(currentMaterial);
                        }

                        //flip texture if this is a dds
                        if(Path.GetExtension(texturePath).ToLower() == ".dds")
                        {
                            currentMaterial.mainTextureScale = new Vector2(1f, -1f);
                        }
                    } else {
                        Debug.LogWarning($"Failed to load diffuse texture: {texturePath}");
                    }

                    continue;
                }

                //bump map
                if (splitLine[0] == "map_Bump" || splitLine[0] == "map_bump")
                {
                    string texturePath = GetTexPathFromMapStatement(processedLine, splitLine);
                    if(texturePath == null)
                    {
                        continue; //invalid args or sth
                    }

                    var bumpTexture = TryLoadTexture(texturePath, true);
                    float bumpScale = GetArgValue(splitLine, "-bm", 1.0f);

                    if (bumpTexture != null) {
                        if (currentMaterial.HasProperty("_BumpMap")) {
                            currentMaterial.SetTexture("_BumpMap", bumpTexture);
                            
                            if (currentMaterial.HasProperty("_BumpScale")) {
                                currentMaterial.SetFloat("_BumpScale", bumpScale);
                            }
                            
                            currentMaterial.EnableKeyword("_NORMALMAP");
                        }
                    }

                    continue;
                }

                //specular color
                if (splitLine[0] == "Ks" || splitLine[0] == "ks")
                {
                    var specColor = OBJLoaderHelper.ColorFromStrArray(splitLine);
                    
                    // Check which property to set based on shader
                    if (currentMaterial.HasProperty("_SpecColor")) {
                        currentMaterial.SetColor("_SpecColor", specColor);
                    } else if (currentMaterial.HasProperty("_SpecularColor")) {
                        currentMaterial.SetColor("_SpecularColor", specColor);
                    } else if (currentMaterial.HasProperty("_Specular")) {
                        currentMaterial.SetColor("_Specular", specColor);
                    }
                    
                    continue;
                }

                //emission color
                if (splitLine[0] == "Ka" || splitLine[0] == "ka")
                {
                    if (currentMaterial.HasProperty("_EmissionColor")) {
                        currentMaterial.SetColor("_EmissionColor", OBJLoaderHelper.ColorFromStrArray(splitLine, 0.05f));
                        currentMaterial.EnableKeyword("_EMISSION");
                    }
                    continue;
                }

                //emission map
                if (splitLine[0] == "map_Ka" || splitLine[0] == "map_ka")
                {
                    string texturePath = GetTexPathFromMapStatement(processedLine, splitLine);
                    if(texturePath == null)
                    {
                        continue; //invalid args or sth
                    }

                    if (currentMaterial.HasProperty("_EmissionMap")) {
                        currentMaterial.SetTexture("_EmissionMap", TryLoadTexture(texturePath));
                    }
                    continue;
                }

                //alpha
                if (splitLine[0] == "d" || splitLine[0] == "Tr")
                {
                    float visibility = OBJLoaderHelper.FastFloatParse(splitLine[1]);
                    
                    //tr statement is just d inverted
                    if(splitLine[0] == "Tr")
                        visibility = 1f - visibility;  

                    if(visibility < (1f - Mathf.Epsilon))
                    {
                        var currentColor = currentMaterial.GetColor("_Color");

                        currentColor.a = visibility;
                        currentMaterial.SetColor("_Color", currentColor);

                        OBJLoaderHelper.EnableMaterialTransparency(currentMaterial);
                    }
                    continue;
                }

                //glossiness
                if (splitLine[0] == "Ns" || splitLine[0] == "ns")
                {
                    float Ns = OBJLoaderHelper.FastFloatParse(splitLine[1]);
                    Ns = (Ns / 1000f);
                    
                    if (currentMaterial.HasProperty("_Glossiness")) {
                        currentMaterial.SetFloat("_Glossiness", Ns);
                    } else if (currentMaterial.HasProperty("_Smoothness")) {
                        currentMaterial.SetFloat("_Smoothness", Ns);
                    }
                }
            }

            //return our dict
            return mtlDict;
        } catch (Exception e) {
            Debug.LogError($"Error in MTLLoader.Load (stream): {e.Message}\n{e.StackTrace}");
            return new Dictionary<string, Material>();
        }
    }

    /// <summary>
    /// Loads a *.mtl file
    /// </summary>
    /// <param name="path">The path to the MTL file</param>
    /// <returns>Dictionary containing loaded materials</returns>
	public Dictionary<string, Material> Load(string path)
    {
        try {
            Debug.Log($"Loading MTL from path: {path}");
            _objFileInfo = new FileInfo(path); //get file info
            SearchPaths.Add(_objFileInfo.Directory.FullName); //add root path to search dir

            // Also add the directory of the MTL file itself as a texture search path
            if (!SearchPaths.Contains(_objFileInfo.Directory.FullName)) {
                SearchPaths.Add(_objFileInfo.Directory.FullName);
            }

            using (var fs = new FileStream(path, FileMode.Open))
            {
                return Load(fs); //actually load
            }
        } catch (Exception e) {
            Debug.LogError($"Error in MTLLoader.Load (path): {e.Message}\n{e.StackTrace}");
            return new Dictionary<string, Material>();
        }
    }
}