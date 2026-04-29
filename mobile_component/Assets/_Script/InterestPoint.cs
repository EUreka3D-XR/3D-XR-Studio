using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;

public class InterestPoint : MonoBehaviour
{
    [HideInInspector] public int idFromWebAppJson;
    [HideInInspector] public interestPoint_Text_Multilanguage titleInterestPoint_Text;
    [HideInInspector] public interestPoint_Text_Multilanguage descriptionInterestPoint_Text;

    private Camera mainCamera;
    
    private bool isDragging;
    private Vector2 previousTouchPosition;
    private float dragDistanceFromCamera;
    private Vector3 dragOffset;
    [Header("Movement Settings (UI nascosta)")]
    [SerializeField] private float depthSpeed = 0.002f;
    
    [HideInInspector] public string interestPoint_Name = "";
    [HideInInspector] public AudioClip interestPoint_Audio;
    [HideInInspector] public string interestPoint_Video_Link = "";

    public string GetTitleByCurrentLanguage()
    {
        if (titleInterestPoint_Text == null) return "No Title";

        string langCode = SelectLanguage.GetSavedLocaleCode();

        string result = langCode switch
        {
            "it" => titleInterestPoint_Text.it,
            "en" => titleInterestPoint_Text.en,
            "es" => titleInterestPoint_Text.es,
            "ca-ES" => titleInterestPoint_Text.ca,
            "fr" => titleInterestPoint_Text.fr,
            "el" => titleInterestPoint_Text.el,
            "de" => titleInterestPoint_Text.de,
            "ru" => titleInterestPoint_Text.ru,
            "zh" => titleInterestPoint_Text.zh,
            _ => titleInterestPoint_Text.en
        };
        
        return string.IsNullOrWhiteSpace(result) ? titleInterestPoint_Text.en : result;
    }

    public string GetDescriptionByCurrentLanguage()
    {
        if (descriptionInterestPoint_Text == null) return string.Empty;

        string langCode = SelectLanguage.GetSavedLocaleCode(); // "it", "en", "es", ecc.

        string result = langCode switch
        {
            "it" => descriptionInterestPoint_Text.it,
            "en" => descriptionInterestPoint_Text.en,
            "es" => descriptionInterestPoint_Text.es,
            "ca-ES" => descriptionInterestPoint_Text.ca,
            "fr" => descriptionInterestPoint_Text.fr,
            "el" => descriptionInterestPoint_Text.el,
            "de" => descriptionInterestPoint_Text.de,
            "ru" => descriptionInterestPoint_Text.ru,
            "zh" => descriptionInterestPoint_Text.zh,
            _ => descriptionInterestPoint_Text.en
        };
        
        return string.IsNullOrWhiteSpace(result) ? descriptionInterestPoint_Text.en : result;
    }

    void Start()
    {
        mainCamera = Camera.main;
    }
    
    public void SetAudioPopControllerClip()
    {
        if (interestPoint_Name == "")
            interestPoint_Name = DateTime.Now.ToString("yyyyMMddHHmmssfff");
        
        Debug.Log($"InterestPoint_Name for match audioClip = {interestPoint_Name}");
        
        if (AudioPopupController.Instance != null &&
            AudioPopupController.Instance.InterestPointAudioClips.TryGetValue(interestPoint_Name, out var clip))
        {
            Debug.Log($"AudioPopupController.Instance.InterestPointAudioClips.TryGetValue({interestPoint_Name}, out var clip)");
            interestPoint_Audio = clip;
        }
    }
    
    void Update()
    {
        transform.LookAt(mainCamera.transform);
        transform.Rotate(0, 180f, 0);
        
        if (!Login.logAsAdmin)
        {
            if (Input.touchCount != 1) return;
            var touch = Input.GetTouch(0);
            
            if (EventSystem.current != null &&
                (EventSystem.current.IsPointerOverGameObject(touch.fingerId) || EventSystem.current.IsPointerOverGameObject()))
                return;
            
            if (touch.phase != TouchPhase.Began) return;
            
            var ray = mainCamera.ScreenPointToRay(touch.position);
            
            int mask = 1 << gameObject.layer;
            
            if (Physics.Raycast(ray, out var hit, 1000f, mask, QueryTriggerInteraction.Collide))
            {
                if (hit.collider && (hit.collider.transform == transform || hit.collider.transform.IsChildOf(transform)))
                {
                    Debug.Log("InterestPoint hit");
                    SetAudioPopControllerClip();
                }
            }
            return;
        }
        
        if (Input.touchCount == 0)
        {
            isDragging = false;
            return;
        }
        
        var t = Input.GetTouch(0);
        
        if (EventSystem.current != null &&
            (EventSystem.current.IsPointerOverGameObject(t.fingerId) || EventSystem.current.IsPointerOverGameObject()))
            return;
        
        int selfMask = 1 << gameObject.layer;
        
        if (t.phase == TouchPhase.Began)
        {
            var ray = mainCamera.ScreenPointToRay(t.position);
            if (Physics.Raycast(ray, out var hit, 1000f, selfMask, QueryTriggerInteraction.Collide))
            {
                if (hit.collider && (hit.collider.transform == transform || hit.collider.transform.IsChildOf(transform)))
                {
                    isDragging = true;

                    var cc = GetComponent<ColorChanger>();
                    if (cc != null) cc.SetHighlightExclusive();

                    TransformUndo.Save(gameObject);
                    
                    dragDistanceFromCamera = Vector3.Distance(mainCamera.transform.position, transform.position);

                    float objectScreenZ = mainCamera.WorldToScreenPoint(transform.position).z;
                    Vector3 worldPointUnderFinger = mainCamera.ScreenToWorldPoint(
                        new Vector3(t.position.x, t.position.y, objectScreenZ)
                    );
                    dragOffset = transform.position - worldPointUnderFinger;

                    previousTouchPosition = t.position;
                }
                else
                {
                    isDragging = false;
                    var cc = GetComponent<ColorChanger>();
                    if (cc != null) cc.RestoreOriginalColors();
                }
            }
            else
            {
                isDragging = false;
                var cc = GetComponent<ColorChanger>();
                if (cc != null) cc.RestoreOriginalColors();
            }
        }
        else if (t.phase == TouchPhase.Moved && isDragging)
        {
            Vector2 delta = t.position - previousTouchPosition;
            previousTouchPosition = t.position;

            if (t.phase == TouchPhase.Ended)
            {
                Vector3 desiredWorldPoint = mainCamera.ScreenToWorldPoint(
                    new Vector3(t.position.x, t.position.y, dragDistanceFromCamera)
                );
                Vector3 targetPos = desiredWorldPoint + dragOffset;

                Vector3 toTarget = targetPos - transform.position;
                Vector3 camRight = mainCamera.transform.right;
                float moveAlongRight = Vector3.Dot(toTarget, camRight);
                Vector3 constrainedDelta = camRight * moveAlongRight;

                transform.position += constrainedDelta;
            }
            else if (t.phase == TouchPhase.Canceled)
            {
                Vector3 desiredWorldPoint = mainCamera.ScreenToWorldPoint(
                    new Vector3(t.position.x, t.position.y, dragDistanceFromCamera)
                );
                Vector3 targetPos = desiredWorldPoint + dragOffset;

                Vector3 toTarget = targetPos - transform.position;
                Vector3 camUp = mainCamera.transform.up;
                float moveAlongUp = Vector3.Dot(toTarget, camUp);
                Vector3 constrainedDelta = camUp * moveAlongUp;

                transform.position += constrainedDelta;
            }
        }
        else if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
        {
            isDragging = false;
        }
    }
}