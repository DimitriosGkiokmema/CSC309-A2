import { IKContext, IKImage, IKUpload } from 'imagekitio-react';
import { updateProfilePic } from '../../js/backend.js';

const urlEndpoint = 'https://ik.imagekit.io/dimi/309_Project';
const publicKey = 'public_Ezy+fEYaGELwaZbrca1PEAsLYH8='; 
const authenticator =  async () => {
    try {
        const response = await fetch('http://localhost:3001/auth');

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const { signature, expire, token } = data;
        return { signature, expire, token };
    } catch (error) {
        throw new Error(`Authentication request failed: ${error.message}`);
    }
};

const onError = err => {
    console.log("Error uploading pic to ImageKit", err);
};

const onSuccess = res => {
    console.log("Successfully uploaded pic to ImageKit", res);
    updateProfilePic(res.url)
};

export default function ImgKit() {
  return (
    <div className="ImgKit">
      <IKContext 
            publicKey={publicKey} 
            urlEndpoint={urlEndpoint} 
            authenticator={authenticator} 
      >
        <label>Update Profile Picture:</label>
        <IKUpload
            folder="/309_Project"
            fileName="profilePic.png"
            onError={onError}
            onSuccess={onSuccess}
        />
      </IKContext>
    </div>
  );
}