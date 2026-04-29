using System.Collections;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using ZXing;
#if UNITY_ANDROID		
using UnityEngine.Android;
#endif

public class QRReader : MonoBehaviour
{
    [Header("UI")]
    [SerializeField] private RawImage rawImage;
    [SerializeField] private GameObject cameraRequiredWarning;
    [SerializeField] private TextMeshProUGUI resultQR_textUI;
    
    // Il testo decodificato
    public const string LastQRCode = "LAST_QR_CODE";
    
    // Eventuale callback
    public System.Action<string> OnQR_Read;
    
    [Header("Scan Settings")]
    [Tooltip("Minimum time between consecutive scans (seconds)")]
    [SerializeField, Range(0.05f, 1f)]
    private float scanInterval = 0.2f;
    
    [SerializeField] private int requestedWidth = 640;
    [SerializeField] private int requestedHeight = 480;
    
    // Internal
    private WebCamTexture camTex;
    private BarcodeReader reader;
    private Color32[] colors;
    private float nextScanTime;
    
    private void Start()
    {
        cameraRequiredWarning.SetActive(false);
        
#if UNITY_ANDROID
        if (!Permission.HasUserAuthorizedPermission(Permission.Camera))
        {
            var callbacks = new PermissionCallbacks();
            callbacks.PermissionGranted += PermissionCallbacks_PermissionGranted;
            callbacks.PermissionDenied += PermissionCallbacks_PermissionDenied;
            Permission.RequestUserPermission(Permission.Camera, callbacks);
            return;
        }
#endif
        InitCamera();
    }
    
#if UNITY_ANDROID
    private void PermissionCallbacks_PermissionGranted(string permissionName)
    {
        Debug.Log($"Permesso '{permissionName}' concesso. Avvio la fotocamera...");
        Splashscreen.loadQrScene();
    }
    
    private void PermissionCallbacks_PermissionDenied(string permissionName)
    {
        cameraRequiredWarning.SetActive(true);
        Debug.LogWarning($"Permesso '{permissionName}' negato. La fotocamera non può essere avviata.");
    }
    
    void OnApplicationFocus(bool hasFocus)
    {
        if (hasFocus && camTex == null && Permission.HasUserAuthorizedPermission(Permission.Camera))
            InitCamera();
    }
#endif
    
    void Update()
    {
        if (camTex == null || !camTex.isPlaying) return;
        
        FixPreviewOrientation();
        
        if (Time.time < nextScanTime || !camTex.didUpdateThisFrame)
            return;
        
        nextScanTime = Time.time + scanInterval;
        
        int pixelCount = camTex.width * camTex.height;
        if (colors == null || colors.Length != pixelCount)
            colors = new Color32[pixelCount];
        
        camTex.GetPixels32(colors);
        
        var result = reader.Decode(colors, camTex.width, camTex.height);
        if (result != null && result.Text != LastQRCode)
        {
            resultQR_textUI.text = LastQRCode;
            Debug.Log($"[QRReader] QR code found: {LastQRCode}");
            OnQR_Read?.Invoke(LastQRCode);
            
            goNextScene();
        }
    }
    
    public void goNextScene()
    {
        Splashscreen.loadKeepAttentionArScene();
    }
    
    public void goNextScene_Debug_1()
    {
        Splashscreen.loadKeepAttentionArScene();
    }
    
    public void goNextScene_Debug_2()
    {
        Splashscreen.loadKeepAttentionArScene();
    }
    
    void OnDestroy()
    {
        if (camTex != null)
        {
            camTex.Stop();
            Destroy(camTex);
        }
    }
    
    private void InitCamera()
    {
        if (camTex != null && camTex.isPlaying)
            return;
        
        cameraRequiredWarning.SetActive(false);
        
        var device = WebCamTexture.devices.FirstOrDefault(d => !d.isFrontFacing);
        camTex = (device.name != null)
            ? new WebCamTexture(device.name, requestedWidth, requestedHeight)
            : new WebCamTexture(requestedWidth, requestedHeight);
        
        rawImage.texture = camTex;
        camTex.Play();
        
        reader = new BarcodeReader
        {
            AutoRotate = false,
            Options = { PossibleFormats = new[] { BarcodeFormat.QR_CODE }, TryHarder = true }
        };
    }
    
    private void FixPreviewOrientation()
    {
        if (camTex == null || camTex.width < 100)
        {
            return;
        }

        RectTransform rawImageRect = rawImage.rectTransform;
        int videoRotationAngle = camTex.videoRotationAngle;

        rawImageRect.localEulerAngles = new Vector3(0, 0, -videoRotationAngle);

        float screenAspectRatio = (float)Screen.width / Screen.height;
        float videoAspectRatio = (float)camTex.width / camTex.height;

        if (videoRotationAngle == 90 || videoRotationAngle == 270)
        {
            videoAspectRatio = 1.0f / videoAspectRatio;
        }

        if (screenAspectRatio > videoAspectRatio)
        {
            rawImageRect.localScale = new Vector3(videoAspectRatio / screenAspectRatio, 1, 1);
        }
        else
        {
            rawImageRect.localScale = new Vector3(1, screenAspectRatio / videoAspectRatio, 1);
        }
        
        rawImage.uvRect = camTex.videoVerticallyMirrored ? new Rect(0, 1, 1, -1) : new Rect(0, 0, 1, 1);
    }
}
