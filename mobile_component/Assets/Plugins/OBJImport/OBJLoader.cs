using System.Collections.Generic;
using System.IO;
using UnityEngine;
using System;
using Dummiesman;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace Dummiesman
{
    public enum SplitMode {
        None,
        Object,
        Material
    }
    
    public class OBJLoader
    {
        //options
        /// <summary>
        /// Determines how objects will be created
        /// </summary>
        public SplitMode SplitMode = SplitMode.Object;

        //global lists, accessed by objobjectbuilder
        internal List<Vector3> Vertices = new List<Vector3>();
        internal List<Vector3> Normals = new List<Vector3>();
        internal List<Vector2> UVs = new List<Vector2>();

        //materials, accessed by objobjectbuilder
        internal Dictionary<string, Material> Materials;

        //file info for files loaded from file path, used for GameObject naming and MTL finding
        private FileInfo _objInfo;

#if UNITY_EDITOR
        [MenuItem("GameObject/Import From OBJ")]
        static void ObjLoadMenu()
        {
            string pth =  EditorUtility.OpenFilePanel("Import OBJ", "", "obj");
            if (!string.IsNullOrEmpty(pth))
            {
                System.Diagnostics.Stopwatch s = new System.Diagnostics.Stopwatch();
                s.Start();

                var loader = new OBJLoader
                {
                    SplitMode = SplitMode.Object,
                };
                loader.Load(pth);

                Debug.Log($"OBJ import time: {s.ElapsedMilliseconds}ms");
                s.Stop();
            }
        }
#endif

        /// <summary>
        /// Helper function to load mtllib statements
        /// </summary>
        /// <param name="mtlLibPath"></param>
        private void LoadMaterialLibrary(string mtlLibPath)
        {
            try {
                if (_objInfo != null)
                {
                    string fullMtlPath = Path.Combine(_objInfo.Directory.FullName, mtlLibPath);
                    if (File.Exists(fullMtlPath))
                    {
                        Debug.Log($"Loading MTL from: {fullMtlPath}");
                        Materials = new MTLLoader().Load(fullMtlPath);
                        return;
                    }
                    else
                    {
                        Debug.LogWarning($"MTL file not found at: {fullMtlPath}");
                    }
                }

                if (File.Exists(mtlLibPath))
                {
                    Debug.Log($"Loading MTL from: {mtlLibPath}");
                    Materials = new MTLLoader().Load(mtlLibPath);
                    return;
                }
                else
                {
                    Debug.LogWarning($"MTL file not found at: {mtlLibPath}");
                }
                
                // Try to find MTL in the same directory with the same name
                if (_objInfo != null)
                {
                    string sameDirSameNameMtl = Path.Combine(_objInfo.Directory.FullName, 
                                                Path.GetFileNameWithoutExtension(_objInfo.Name) + ".mtl");
                    if (File.Exists(sameDirSameNameMtl))
                    {
                        Debug.Log($"Loading MTL from: {sameDirSameNameMtl}");
                        Materials = new MTLLoader().Load(sameDirSameNameMtl);
                        return;
                    }
                }
            }
            catch (Exception e) {
                Debug.LogError($"Error loading MTL: {e.Message}\n{e.StackTrace}");
            }
        }

        /// <summary>
        /// Load an OBJ file from a stream. No materials will be loaded, and will instead be supplemented by a blank white material.
        /// </summary>
        /// <param name="input">Input OBJ stream</param>
        /// <returns>Returns a GameObject represeting the OBJ file, with each imported object as a child.</returns>
        public GameObject Load(Stream input)
        {
            try {
                var reader = new StreamReader(input);
                
                Dictionary<string, OBJObjectBuilder> builderDict = new Dictionary<string, OBJObjectBuilder>();
                OBJObjectBuilder currentBuilder = null;
                string currentMaterial = "default";

                //lists for face data
                //prevents excess GC
                List<int> vertexIndices = new List<int>();
                List<int> normalIndices = new List<int>();
                List<int> uvIndices = new List<int>();

                //helper func
                Action<string> setCurrentObjectFunc = (string objectName) =>
                {
                    if (!builderDict.TryGetValue(objectName, out currentBuilder))
                    {
                        currentBuilder = new OBJObjectBuilder(objectName, this);
                        builderDict[objectName] = currentBuilder;
                    }
                };

                //create default object
                setCurrentObjectFunc.Invoke("default");

                //var buffer = new DoubleBuffer(reader, 256 * 1024);
                var buffer = new CharWordReader(reader, 4 * 1024);

                //do the reading
                while (true)
                {
                    buffer.SkipWhitespaces();

                    if (buffer.endReached == true) {
                        break;
                    }

                    buffer.ReadUntilWhiteSpace();
                    
                    //comment or blank
                    if (buffer.Is("#"))
                    {
                        buffer.SkipUntilNewLine();
                        continue;
                    }
                    
                    if (Materials == null && buffer.Is("mtllib")) {
                        buffer.SkipWhitespaces();
                        buffer.ReadUntilNewLine();
                        string mtlLibPath = buffer.GetString();
                        LoadMaterialLibrary(mtlLibPath);
                        continue;
                    }
                    
                    if (buffer.Is("v")) {
                        Vertices.Add(buffer.ReadVector());
                        continue;
                    }

                    //normal
                    if (buffer.Is("vn")) {
                        Normals.Add(buffer.ReadVector());
                        continue;
                    }

                    //uv
                    if (buffer.Is("vt")) {
                        UVs.Add(buffer.ReadVector());
                        continue;
                    }

                    //new material
                    if (buffer.Is("usemtl")) {
                        buffer.SkipWhitespaces();
                        buffer.ReadUntilNewLine();
                        string materialName = buffer.GetString();
                        currentMaterial = materialName;

                        if(SplitMode == SplitMode.Material)
                        {
                            setCurrentObjectFunc.Invoke(materialName);
                        }
                        continue;
                    }

                    //new object
                    if ((buffer.Is("o") || buffer.Is("g")) && SplitMode == SplitMode.Object) {
                        buffer.ReadUntilNewLine();
                        string objectName = buffer.GetString(1);
                        setCurrentObjectFunc.Invoke(objectName);
                        continue;
                    }

                    //face data (the fun part)
                    if (buffer.Is("f"))
                    {
                        //loop through indices
                        while (true)
                        {
                            bool newLinePassed;
                            buffer.SkipWhitespaces(out newLinePassed);
                            if (newLinePassed == true) {
                                break;
                            }

                            int vertexIndex = int.MinValue;
                            int normalIndex = int.MinValue;
                            int uvIndex = int.MinValue;

                            vertexIndex = buffer.ReadInt();
                            if (buffer.currentChar == '/') {
                                buffer.MoveNext();
                                if (buffer.currentChar != '/') {
                                    uvIndex = buffer.ReadInt();
                                }
                                if (buffer.currentChar == '/') {
                                    buffer.MoveNext();
                                    normalIndex = buffer.ReadInt();
                                }
                            }

                            //"postprocess" indices
                            if (vertexIndex > int.MinValue)
                            {
                                if (vertexIndex < 0)
                                    vertexIndex = Vertices.Count - vertexIndex;
                                vertexIndex--;
                            }
                            if (normalIndex > int.MinValue)
                            {
                                if (normalIndex < 0)
                                    normalIndex = Normals.Count - normalIndex;
                                normalIndex--;
                            }
                            if (uvIndex > int.MinValue)
                            {
                                if (uvIndex < 0)
                                    uvIndex = UVs.Count - uvIndex;
                                uvIndex--;
                            }

                            //set array values
                            vertexIndices.Add(vertexIndex);
                            normalIndices.Add(normalIndex);
                            uvIndices.Add(uvIndex);
                        }

                        //push to builder
                        currentBuilder.PushFace(currentMaterial, vertexIndices, normalIndices, uvIndices);

                        //clear lists
                        vertexIndices.Clear();
                        normalIndices.Clear();
                        uvIndices.Clear();

                        continue;
                    }

                    buffer.SkipUntilNewLine();
                }

                //finally, put it all together
                GameObject obj = new GameObject(_objInfo != null ? Path.GetFileNameWithoutExtension(_objInfo.Name) : "WavefrontObject");
                obj.transform.localScale = new Vector3(-1f, 1f, 1f);

                foreach (var builder in builderDict)
                {
                    //empty object
                    if (builder.Value.PushedFaceCount == 0)
                        continue;

                    var builtObj = builder.Value.Build();
                    builtObj.transform.SetParent(obj.transform, false);
                }

                return obj;
            }
            catch (Exception e) {
                Debug.LogError($"Error loading OBJ: {e.Message}\n{e.StackTrace}");
                return new GameObject("Error_OBJLoad");
            }
        }

        /// <summary>
        /// Load an OBJ and MTL file from a stream.
        /// </summary>
        /// <param name="input">Input OBJ stream</param>
        /// /// <param name="mtlInput">Input MTL stream</param>
        /// <returns>Returns a GameObject represeting the OBJ file, with each imported object as a child.</returns>
        public GameObject Load(Stream input, Stream mtlInput)
        {
            try {
                var mtlLoader = new MTLLoader();
                Materials = mtlLoader.Load(mtlInput);

                return Load(input);
            }
            catch (Exception e) {
                Debug.LogError($"Error loading OBJ+MTL: {e.Message}\n{e.StackTrace}");
                return new GameObject("Error_OBJMTLLoad");
            }
        }

        /// <summary>
        /// Load an OBJ and MTL file from a file path.
        /// </summary>
        /// <param name="path">Input OBJ path</param>
        /// /// <param name="mtlPath">Input MTL path</param>
        /// <returns>Returns a GameObject represeting the OBJ file, with each imported object as a child.</returns>
        public GameObject Load(string path, string mtlPath)
        {
            try {
                Debug.Log($"Loading OBJ from path: {path}");
                _objInfo = new FileInfo(path);
                
                if (!string.IsNullOrEmpty(mtlPath) && File.Exists(mtlPath))
                {
                    Debug.Log($"Loading with MTL path: {mtlPath}");
                    var mtlLoader = new MTLLoader();
                    Materials = mtlLoader.Load(mtlPath);

                    using (var fs = new FileStream(path, FileMode.Open))
                    {
                        return Load(fs);
                    }
                }
                else
                {
                    if (!string.IsNullOrEmpty(mtlPath)) {
                        Debug.LogWarning($"MTL file not found at path: {mtlPath}");
                    }
                    
                    // Try to find MTL with same name in same directory
                    string potentialMtlPath = Path.Combine(
                        Path.GetDirectoryName(path),
                        Path.GetFileNameWithoutExtension(path) + ".mtl"
                    );
                    
                    if (File.Exists(potentialMtlPath)) {
                        Debug.Log($"Found MTL with same name: {potentialMtlPath}");
                        var mtlLoader = new MTLLoader();
                        Materials = mtlLoader.Load(potentialMtlPath);
                    }
                    
                    using (var fs = new FileStream(path, FileMode.Open))
                    {
                        return Load(fs);
                    }
                }
            }
            catch (Exception e) {
                Debug.LogError($"Error in OBJLoader.Load: {e.Message}\n{e.StackTrace}");
                return new GameObject("Error_OBJPathLoad");
            }
        }

        /// <summary>
        /// Load an OBJ file from a file path. This function will also attempt to load the MTL defined in the OBJ file.
        /// </summary>
        /// <param name="path">Input OBJ path</param>
        /// <returns>Returns a GameObject represeting the OBJ file, with each imported object as a child.</returns>
        public GameObject Load(string path)
        {
            return Load(path, null);
        }
    }
}