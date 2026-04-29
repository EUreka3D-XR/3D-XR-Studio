using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class InterestPoint_Manager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private GameObject interestPointPrefab;
    [SerializeField] private GameObject popUp_InterestPointTitle;
    [SerializeField] private TMP_InputField inputField_InterestPointTitle;
    public Transform interestPointsParent;
    
    [Header("Spawn Settings")] 
    private const float spawnDistance = 3f;

    private string lastTitleWrote;
    
    public static InterestPoint_Manager Instance;
    
    private void Awake()
    {
        Instance = this;
    }
    
    public void openPopUp_InterestPointTitle()
    {
        popUp_InterestPointTitle.SetActive(true);
        inputField_InterestPointTitle.text = "";
    }
    
    public void closePopUp_InterestPointTitle()
    {
        lastTitleWrote = inputField_InterestPointTitle.text;
        popUp_InterestPointTitle.SetActive(false);
        AddInterestPoint();
    }
    
    public void AddInterestPoint()
    {
        Camera cam = Camera.main;
        Vector3 pos = cam.transform.position + cam.transform.forward * spawnDistance;
        GameObject go = Instantiate(interestPointPrefab, pos, Quaternion.identity, interestPointsParent);
        if (!go.TryGetComponent<ColorChanger>(out _))            
            go.AddComponent<ColorChanger>();
        go.GetComponent<ColorChanger>().highlightMaterial = ARPathBuilder.Instance.highlightMaterial;
        go.GetComponent<InterestPoint>().idFromWebAppJson = -1;
        
        var newTitle = new interestPoint_Text_Multilanguage { it = lastTitleWrote, en = lastTitleWrote };
        go.GetComponent<InterestPoint>().titleInterestPoint_Text = newTitle;
        
        go.GetComponent<InterestPoint>().descriptionInterestPoint_Text = new interestPoint_Text_Multilanguage();
    }

    public void AddInterestPointInformation(string _interestPoint_Name, interestPoint_Text_Multilanguage _interestPoint_Title, 
        interestPoint_Text_Multilanguage interestPoint_Description, string _interestPoint_Video_URL, Vector3 interestPointPosition, int _idFromWebAppJson = -1)
    {
        Camera cam = Camera.main;
        Vector3 pos = cam.transform.position + cam.transform.forward * spawnDistance;
        GameObject go = Instantiate(interestPointPrefab, pos, Quaternion.identity, interestPointsParent);
        
        Debug.Log("AddInterestPointInformation");
        
        go.GetComponent<InterestPoint>().interestPoint_Name = _interestPoint_Name;
        go.GetComponent<InterestPoint>().titleInterestPoint_Text = _interestPoint_Title;
        go.GetComponent<InterestPoint>().descriptionInterestPoint_Text = interestPoint_Description;
        go.GetComponent<InterestPoint>().interestPoint_Video_Link = _interestPoint_Video_URL;
        go.GetComponent<InterestPoint>().idFromWebAppJson = _idFromWebAppJson;
        
        if (!go.TryGetComponent<ColorChanger>(out _))            
            go.AddComponent<ColorChanger>();
        go.GetComponent<ColorChanger>().highlightMaterial = ARPathBuilder.Instance.highlightMaterial;
        
        if (interestPointPosition != default)
            go.transform.position = interestPointPosition;
    }
}
