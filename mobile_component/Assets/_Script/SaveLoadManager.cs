using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;

[Serializable]
public class ObjectTransformData
{
    public int id;
    public string modelName;
    public Vector3 position;
    public Vector3 rotation;
    public Quaternion rotQuaternion; // Serve per i wall
    public Vector3 scale;
}

[Serializable]
public class PathPointData
{
    public int id;
    public Vector3 position;
    public int index;
}

public class SaveLoadManager : MonoBehaviour
{
    public GameObject parentObject;
    public GameObject parentPathPoints;
    public GameObject parentInterestPoints;
    public GameObject wallPrefab;
    public AudioPopupController audioPopupController;
    
    [Header("Save/Load PopUp")]
    [SerializeField] private GameObject saveSuccessPopUp;
    [SerializeField] private GameObject waitingForSavingProcessPopUp;
    [SerializeField] private GameObject saveFailPopUp;
    [SerializeField] private GameObject loadSuccessPopUp;
    [SerializeField] private GameObject loadFailPopUp;
    
    public static string savePath => Path.Combine(Application.persistentDataPath, "environmentData.json");
    
    private bool isSaving = false;
    
    public static SaveLoadManager Instance;
    
    private void Awake()
    {
        Instance = this;
    }
    
    public async void SaveObjects()
    {
        if (isSaving)
            return;
        
        waitingForSavingProcessPopUp.SetActive(true);
        isSaving = true;
        
        try
        {
            List<ObjectTransformData> dataList = new List<ObjectTransformData>();
            
            foreach (Transform child in parentObject.transform)
            {
                ObjectTransformData data = new ObjectTransformData
                {
                    modelName = child.name.Replace("(Clone)", "").Trim(),
                    position = child.position,
                    rotation = child.localRotation.eulerAngles,
                    rotQuaternion = child.localRotation,
                    scale = child.localScale
                };
                dataList.Add(data);
            }
            
            List<PathPointData> pathList = new List<PathPointData>();
            foreach (Transform point in parentPathPoints.transform)
            {
                pathList.Add(new PathPointData
                {
                    position = point.position,
                    index = ARPathBuilder.Instance.nodes.IndexOf(point) + 1
                });
            }
            
            List<ApiInterestPointData> interestPointsList = new List<ApiInterestPointData>();
            foreach (var interestPoint in InterestPoint_Manager.Instance.interestPointsParent.GetComponentsInChildren<InterestPoint>())
            {
                interestPointsList.Add(new ApiInterestPointData
                {
                    id = interestPoint?.idFromWebAppJson ?? -1,
                    interestPoint_Name = interestPoint.interestPoint_Name,
                    interestPoint_Title_Text = interestPoint.titleInterestPoint_Text,
                    interestPoint_Description_Text = interestPoint.descriptionInterestPoint_Text,
                    interestPoint_Video_URL = interestPoint.interestPoint_Video_Link,
                    mascottePosition = interestPoint.transform.position
                });
            }
            
            var wrapper = new ObjectTransformData_Parent()
            {
                objects = dataList,
                path_points = pathList,
                interest_points = interestPointsList
            };
            
            string json = JsonUtility.ToJson(wrapper, true);
            await File.WriteAllTextAsync(savePath, json);
            
            Debug.Log("Salvataggio locale completato: " + savePath);
            
            await ExportJsonToApi(json);
            
            waitingForSavingProcessPopUp.SetActive(false);
            isSaving = false;
        }
        catch (Exception e)
        {
            Debug.LogError("Errore durante il salvataggio: " + e.Message);
            waitingForSavingProcessPopUp.SetActive(false);
            saveFailPopUp.SetActive(true);
            isSaving = false;
            throw;
        }
    }
    
    public void LoadObjects()
    {
        if (!File.Exists(savePath))
        {
            loadFailPopUp.SetActive(true);
            Debug.Log("Nessun file di salvataggio trovato!");
            return;
        }

        string json = File.ReadAllText(savePath);
        var dataWrapper = JsonUtility.FromJson<ObjectTransformData_Parent>(json);

        int debugNumItems = 0;
        
        foreach (Transform child in parentObject.transform)
            Destroy(child.gameObject);
        
        foreach (Transform point in parentPathPoints.transform)
            Destroy(point.gameObject);
        
        foreach (Transform point in parentInterestPoints.transform)
            Destroy(point.gameObject);
        
        foreach (ObjectTransformData data in dataWrapper.objects)
        {
            if (data.modelName == "Wall")
            {
                Quaternion rotationToUse;
                rotationToUse = Quaternion.Euler(data.rotation);

                GameObject obj = Instantiate(wallPrefab, parentObject.transform);

                obj.transform.position = data.position;
                obj.transform.localRotation = rotationToUse;
                obj.transform.localScale = data.scale;

                debugNumItems++;
                Debug.Log($"Wall instance based on json");
            }
            else
            {

                if (dataWrapper.objects.ToList().Count >= 0)
                {
                    debugNumItems++;
                    Debug.Log($"Model '{data.modelName}' instance based on json");
                }
                else
                {
                    Debug.LogWarning($"Model '{data.modelName}' in json, not loaded or not supported");
                }
            }
        }
        
        Debug.Log("Caricamento completato di " + debugNumItems + " oggetti.");
        
        ARPathBuilder.Instance.clearPathAndReassignPoints(dataWrapper.path_points);
        
        foreach (var interestPoint in dataWrapper.interest_points)
            InterestPoint_Manager.Instance.AddInterestPointInformation(interestPoint.interestPoint_Name, 
                interestPoint.interestPoint_Title_Text, interestPoint.interestPoint_Description_Text,
                interestPoint.interestPoint_Video_URL, interestPoint.mascottePosition,
                interestPoint.id);
        
        if (Login.logAsAdmin)
            loadSuccessPopUp.SetActive(true);
        
        audioPopupController.LoadLocalInterestPointAudios();
    }
    
    public async Task LoadInterestPointsWithMedia()
    {
        if (!File.Exists(savePath))
        {
            Debug.LogError("[AR_SceneManager] savePath non trovato, impossibile scaricare i modelli.");
            return;
        }
        
        string jsonContent = await File.ReadAllTextAsync(savePath);
        ObjectTransformData_Parent interestPointsJson = JsonUtility.FromJson<ObjectTransformData_Parent>(jsonContent);
        var interestPoints = interestPointsJson.interest_points;
        
        if (interestPoints == null || interestPoints.Count == 0)
        {
            Debug.Log("[SaveLoadManager] Nessun interest point da caricare");
            CleanupUnusedFiles(AudioPopupController.INTEREST_POINTS_AUDIO_FOLDER, new HashSet<string>());
            return;
        }


        Debug.Log($"[SaveLoadManager] Inizio caricamento di {interestPoints.Count} interest points...");
        
        HashSet<string> validImageFiles = new HashSet<string>();
        HashSet<string> validAudioFiles = new HashSet<string>();

        string currentLang = SelectLanguage.GetSavedLocaleCode();

        foreach (var poi in interestPoints)
        {
            if (poi.media == null) continue;

            foreach (var media in poi.media)
            {
                string originalUrlPath = media.url;
                string ext = Path.GetExtension(originalUrlPath);

                if (media.type.ToLower() == "image")
                {
                    if (string.IsNullOrEmpty(ext)) ext = ".png";
                    string fileName = $"InterestPoint_{poi.interestPoint_Name}_{media.id}{ext}";
                    validImageFiles.Add(fileName);
                }
                else if (media.type.ToLower() == "audio")
                {
                    if (media.lang == currentLang)
                    {
                        if (string.IsNullOrEmpty(ext)) ext = ".mp3";
                        string fileName = $"InterestPoint_{poi.interestPoint_Name}_{media.id}{ext}";
                        validAudioFiles.Add(fileName);
                    }
                }
            }
            
            CleanupUnusedFiles(AudioPopupController.INTEREST_POINTS_AUDIO_FOLDER, validAudioFiles);

            foreach (var apiInterestPoint in interestPoints)
            {
                try
                {
                    List<string> localImagePaths = new List<string>();
                    List<string> localAudioPaths = new List<string>();

                    if (apiInterestPoint.media != null && apiInterestPoint.media.Count > 0)
                    {
                        Debug.Log(
                            $"[SaveLoadManager] Trovati {apiInterestPoint.media.Count} media per '{apiInterestPoint.interestPoint_Name}'");

                        foreach (var media in apiInterestPoint.media)
                        {
                            string downloadUrl = media.download_url;
                            string originalUrlPath = media.url;

                            if (string.IsNullOrEmpty(downloadUrl))
                            {
                                Debug.LogWarning(
                                    $"[SaveLoadManager] URL download vuoto per media ID {media.id}, Type={media.type}");
                                continue;
                            }

                            switch (media.type.ToLower())
                            {
                                case "image":
                                    string ext = Path.GetExtension(originalUrlPath);
                                    if (string.IsNullOrEmpty(ext)) ext = ".png";

                                    string imageFileName =
                                        $"InterestPoint_{apiInterestPoint.interestPoint_Name}_{media.id}{ext}";
                                    Debug.Log(
                                        $"[SaveLoadManager] Downloading image: {imageFileName} from {downloadUrl}");
                                    
                                    string imagePath =
                                        await MediaDownloader.Instance.DownloadImage(downloadUrl, imageFileName);
                                    if (!string.IsNullOrEmpty(imagePath))
                                    {
                                        localImagePaths.Add(imagePath);
                                        Debug.Log($"[SaveLoadManager] Image downloaded successfully: {imagePath}");
                                    }
                                    else
                                    {
                                        Debug.LogError($"[SaveLoadManager] Image download failed for {imageFileName}");
                                    }

                                    break;

                                case "audio":
                                    if (media.lang != SelectLanguage.GetSavedLocaleCode())
                                        continue;

                                    string audioExt = Path.GetExtension(originalUrlPath);

                                    if (string.IsNullOrEmpty(audioExt)) audioExt = ".mp3";

                                    string audioFileName =
                                        $"InterestPoint_{apiInterestPoint.interestPoint_Name}_{media.id}{audioExt}";
                                    Debug.Log(
                                        $"[SaveLoadManager] Audio Setup: File={audioFileName} | ExtSource={originalUrlPath} | DL={downloadUrl}");

                                    string audioPath =
                                        await MediaDownloader.Instance.DownloadAudio(downloadUrl, audioFileName);
                                    if (!string.IsNullOrEmpty(audioPath))
                                    {
                                        localAudioPaths.Add(audioPath);
                                        Debug.Log($"[SaveLoadManager] Audio downloaded successfully: {audioPath}");
                                    }
                                    else
                                    {
                                        Debug.LogError($"[SaveLoadManager] Audio download failed for {audioFileName}");
                                    }

                                    break;

                                case "video":
                                    Debug.Log($"[SaveLoadManager] Video URL registrato: {downloadUrl}");
                                    break;

                                default:
                                    Debug.LogWarning($"[SaveLoadManager] Tipo media sconosciuto: {media.type}");
                                    break;
                            }
                        }

                        Debug.Log(
                            $"[SaveLoadManager] Download completato per '{apiInterestPoint.interestPoint_Name}': {localImagePaths.Count} immagini, {localAudioPaths.Count} audio");
                    }
                    else
                    {
                        Debug.Log(
                            $"[SaveLoadManager] Nessun media trovato per '{apiInterestPoint.interestPoint_Name}'");
                    }

                    InterestPoint_Manager.Instance.AddInterestPointInformation(
                        apiInterestPoint.interestPoint_Name,
                        apiInterestPoint.interestPoint_Title_Text,
                        apiInterestPoint.interestPoint_Description_Text,
                        apiInterestPoint.interestPoint_Video_URL,
                        apiInterestPoint.mascottePosition,
                        apiInterestPoint.id
                    );

                    Debug.Log($"[SaveLoadManager] Interest point '{apiInterestPoint.interestPoint_Name}' caricato: " +
                              $"{localImagePaths.Count} immagini, {localAudioPaths.Count} audio");
                }
                catch (Exception e)
                {
                    Debug.LogError(
                        $"[SaveLoadManager] Errore caricamento interest point '{apiInterestPoint.interestPoint_Name}': {e.Message}");
                }
            }
        }
    }
    
    private void CleanupUnusedFiles(string folderPath, HashSet<string> validFileNames)
    {
        if (!Directory.Exists(folderPath)) return;

        try
        {
            string[] files = Directory.GetFiles(folderPath);
            int deletedCount = 0;

            foreach (string filePath in files)
            {
                string fileName = Path.GetFileName(filePath);

                if (!validFileNames.Contains(fileName))
                {
                    try
                    {
                        File.Delete(filePath);
                        deletedCount++;
                        Debug.Log($"[Cleanup] Eliminato file obsoleto o sconosciuto: {fileName}");
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError($"[Cleanup] Impossibile eliminare {fileName}: {ex.Message}");
                    }
                }
            }
            if (deletedCount > 0)
                Debug.Log($"[Cleanup] Pulizia completata in {folderPath}. Eliminati {deletedCount} file.");
        }
        catch (Exception e)
        {
            Debug.LogError($"[Cleanup] Errore generale durante pulizia cartella {folderPath}: {e.Message}");
        }
    }

    private async Task ExportJsonToApi(string jsonContent)
    {
        string serialCode = QRReader.LastQRCode;

        if (string.IsNullOrEmpty(serialCode))
        {
            Debug.LogError("[SaveLoadManager] SERIAL_CODE mancante (QRReader.LastQRCode è vuoto), impossibile esportare.");
            saveFailPopUp.SetActive(true);
            return;
        }

        string endpoint = $"/environments/exportbytotem/{serialCode}";
        var dataWrapper = JsonUtility.FromJson<ObjectTransformData_Parent>(jsonContent);
        var result = await Api.Instance.Client.PostJson<ObjectTransformData_Parent, string>(endpoint, dataWrapper);

        if (result.ok)
        {
            Debug.Log($"[SaveLoadManager] Esportazione riuscita per Totem: {serialCode}");
            saveSuccessPopUp.SetActive(true);
        }
    }
}