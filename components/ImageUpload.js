import { useRef, useState } from 'react';

const ImageUpload = ({ onUploadSuccess, buttonText = "📷 Choisir une image", buttonStyle = {} }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide');
      return;
    }

    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setUploading(true);

    try {
      // Upload vers Cloudinary via leur API REST
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.secure_url) {
        console.log('✅ Image uploadée:', data.secure_url);
        if (onUploadSuccess) {
          onUploadSuccess(data.secure_url);
        }
        alert('Image uploadée avec succès !');
      } else {
        throw new Error('URL de l\'image non reçue');
      }
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert('Erreur lors de l\'upload: ' + error.message);
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!uploading) {
      inputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        style={{
          padding: '8px 16px',
          backgroundColor: uploading ? '#ccc' : '#4a90e2',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: uploading ? 0.7 : 1,
          ...buttonStyle
        }}
      >
        {uploading ? '⏳ Upload...' : buttonText}
      </button>
    </>
  );
};

export default ImageUpload;