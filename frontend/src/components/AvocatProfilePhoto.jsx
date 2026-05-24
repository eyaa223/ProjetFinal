import React, { useRef, useState } from "react";

function AvocatProfilePhoto({ existingPhotoUrl }) {
  const [photo, setPhoto] = useState(existingPhotoUrl || null);
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setPhoto(evt.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="avocat-header">
      <div className="avocat-image-wrapper">
        <div className="avocat-circle-bg" onClick={() => fileInputRef.current.click()} style={{ cursor: "pointer" }}>
          {photo ? (
            <img
              src={photo}
              alt="Profil avocat"
              className="avocat-circle-image"
              style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '100%' }}
            />
          ) : (
            // Fallback: icône ou vignette si pas de photo
            <img 
              src="/assets/avocat.png"
              alt="Avocat - Balance de la justice"
              className="avocat-circle-image"
            />
          )}
        </div>
        {/* Input caché pour uploader */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

export default AvocatProfilePhoto;