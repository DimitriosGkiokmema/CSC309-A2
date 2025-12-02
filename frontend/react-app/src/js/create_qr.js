import QRCode from "qrcode";

// Returns a url link to the qr code
export async function jsonToQRUrl(jsonObj) {
    const str = JSON.stringify(jsonObj);
    const url = await QRCode.toDataURL(str, {
      errorCorrectionLevel: "H"
    });

    return url;
}

// Example
// jsonToQRUrl({ a: 1, b: 2 }).then(url => {
//   console.log(url);
// });
