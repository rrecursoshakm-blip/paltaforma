Attribute VB_Name = "ModuloEnvioBoletas"
Option Explicit

' ==============================================================================
' Automatizacion de Envio de Boletas via Outlook (Version Masiva)
' ==============================================================================
' Instrucciones:
' 1. En la celda G1 de la hoja "Boletas", pega la ruta de tu carpeta: C:\Ruta\
' 2. Ejecuta "ListarArchivosPDF" para traer todos los nombres de archivo a la Columna C.
' 3. Completa los nombres y correos en las columnas A y B.
' 4. Ejecuta "EnviarBoletas" para realizar el envio.
' ==============================================================================

Sub ListarArchivosPDF()
    Dim Sh As Worksheet
    Dim RutaCarpeta As String
    Dim Archivo As String
    Dim Fila As Long
    
    Set Sh = ThisWorkbook.Sheets("Boletas")
    RutaCarpeta = Trim(Sh.Range("G1").Value)
    
    If RutaCarpeta = "" Then
        MsgBox "Por favor, coloca la ruta de la carpeta en la celda G1", vbExclamation
        Exit Sub
    End If
    
    ' Asegurar que termine en \
    If Right(RutaCarpeta, 1) <> "\" Then RutaCarpeta = RutaCarpeta & "\"
    
    ' Limpiar columna C desde la fila 2 para nuevos datos
    Fila = Sh.Cells(Sh.Rows.Count, "C").End(xlUp).Row
    If Fila >= 2 Then Sh.Range("C2:C" & Fila).ClearContents
    
    ' Buscar primer PDF
    Archivo = Dir(RutaCarpeta & "*.pdf")
    Fila = 2
    
    If Archivo = "" Then
        MsgBox "No se encontraron archivos PDF en esa carpeta.", vbInformation
        Exit Sub
    End If
    
    ' Listar todos los PDF encontrados
    Do While Archivo <> ""
        Sh.Cells(Fila, "C").Value = Archivo
        
        ' --- NUEVA MEJORA: Auto-completar Nombre (Columna A) ---
        Dim NombreLimpio As String
        NombreLimpio = Replace(Archivo, ".pdf", "", , , vbTextCompare) ' Quitar .pdf
        NombreLimpio = Replace(NombreLimpio, "-", " ") ' Cambiar guiones por espacios
        NombreLimpio = Replace(NombreLimpio, "_", " ") ' Cambiar guion bajo por espacios
        
        ' Poner en Mayusculas la primera letra de cada palabra (Proper Case)
        Sh.Cells(Fila, "A").Value = Application.WorksheetFunction.Proper(NombreLimpio)
        ' ------------------------------------------------------
        
        Fila = Fila + 1
        Archivo = Dir() ' Siguiente archivo
    Loop
    
    MsgBox "Se han listado " & Fila - 2 & " archivos PDF.", vbInformation
End Sub

Sub EnviarBoletas()
    Dim OutlookApp As Object
    Dim OutlookMail As Object
    Dim Sh As Worksheet
    Dim i As Long
    Dim UltimaFila As Long
    Dim Respuesta As VbMsgBoxResult
    
    ' Preguntar si desea enviar o solo mostrar (Vista Previa)
    Respuesta = MsgBox("¿Desea enviar los correos directamente?" & vbCrLf & _
                "Si selecciona 'No', solo se mostraran para revision.", _
                vbYesNoCancel + vbQuestion, "Modo de Envio")
    
    If Respuesta = vbCancel Then Exit Sub
    
    Set Sh = ThisWorkbook.Sheets("Boletas")
    UltimaFila = Sh.Cells(Sh.Rows.Count, "C").End(xlUp).Row
    
    ' Obtener la carpeta desde la celda G1
    Dim RutaCarpeta As String
    RutaCarpeta = Trim(Sh.Range("G1").Value)
    If RutaCarpeta <> "" Then
        If Right(RutaCarpeta, 1) <> "\" Then RutaCarpeta = RutaCarpeta & "\"
    End If
    
    On Error Resume Next
    Set OutlookApp = GetObject(Class:="Outlook.Application")
    If OutlookApp Is Nothing Then
        Set OutlookApp = CreateObject(Class:="Outlook.Application")
    End If
    On Error GoTo 0
    
    If OutlookApp Is Nothing Then
        MsgBox "No se pudo abrir Outlook. Por favor, asegurese de que este instalado.", vbCritical
        Exit Sub
    End If
    
    For i = 2 To UltimaFila
        ' Validacion basica de datos (Requiere Email y Archivo)
        If Sh.Cells(i, "B").Value <> "" And Sh.Cells(i, "C").Value <> "" Then
            
            Set OutlookMail = OutlookApp.CreateItem(0) ' 0 = olMailItem
            
            With OutlookMail
                .To = Sh.Cells(i, "B").Value
                .Subject = Sh.Cells(i, "D").Value
                
                ' Cuerpo formal
                .HTMLBody = "<html><body style='font-family: Arial; font-size: 11pt; color: #000;'>" & _
                           "<p>Hola <b>" & Sh.Cells(i, "A").Value & "</b>,</p>" & _
                           "<p>Adjunto boleta del mes.</p>" & _
                           "<p>Cualquier consulta me la hace llegar.</p>" & _
                           "<p>Saludos Cordiales.</p>" & _
                           "</body></html>"
                
                ' Adjuntar archivo
                Dim NombreArchivo As String
                Dim RutaFinal As String
                
                NombreArchivo = Trim(Sh.Cells(i, "C").Value)
                
                If InStr(NombreArchivo, ":\") = 0 Then
                    RutaFinal = RutaCarpeta & NombreArchivo
                Else
                    RutaFinal = NombreArchivo
                End If
                
                If Dir(RutaFinal) <> "" Then
                    .Attachments.Add RutaFinal
                    
                    If Respuesta = vbYes Then
                        .Send
                        Sh.Cells(i, "E").Value = "Enviado el " & Now
                    Else
                        .Display
                        Sh.Cells(i, "E").Value = "Vista Previa Generada"
                    End If
                Else
                    Sh.Cells(i, "E").Value = "Error: No se encontro en " & RutaFinal
                End If
                
            End With
            
            Set OutlookMail = Nothing
        End If
    Next i
    
    MsgBox "Proceso completado.", vbInformation
    
End Sub
