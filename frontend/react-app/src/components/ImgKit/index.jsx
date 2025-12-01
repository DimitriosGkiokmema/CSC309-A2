import { IKContext, IKImage, IKUpload } from 'imagekitio-react';
import { updateProfilePic } from '../../js/backend.js';
import { useUser } from "../UserContext/index.jsx";

const urlEndpoint = import.meta.env.VITE_IMAGEKIT_ENDPOINT;
const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY; 
const authenticator =  async () => {
    try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/img/auth`);

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

export default function ImgKit() {
  const { setPic } = useUser();

  const onError = err => {
      console.log("Error uploading pic to ImageKit", err);
  };

  const onSuccess = res => {
      console.log("Successfully uploaded pic to ImageKit", res);
      updateProfilePic(res.url);
      setPic(res.url);
  };

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