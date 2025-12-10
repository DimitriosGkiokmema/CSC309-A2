import { IKContext, IKUpload } from 'imagekitio-react';
import { updateProfilePic } from '../../js/backend.js';
import { useUser } from "../UserContext/index.jsx";

const urlEndpoint = "https://ik.imagekit.io/dimi/309_Project";
const publicKey = "public_Ezy+fEYaGELwaZbrca1PEAsLYH8=";
console.log(publicKey);
console.log(urlEndpoint);


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

export default function ImgKit({ result }) {
  const { setPic } = useUser();

  const onError = err => {
      result(`❌ Error uploading pic to ImageKit: ${err}`);
  };

  const onSuccess = res => {
      result(`✅ Successfully uploaded pic to ImageKit `);
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