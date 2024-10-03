import {credential} from "firebase-admin";
import {initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";

initializeApp({credential: credential.applicationDefault()});

const firestore = new Firestore();

const videoCollectionId = 'videos';

export interface Video {
    id?: string,
    uid?: string,
    filename?: string,
    status?: 'processing' | 'processed'
    title?: string,
    description?: string
}

async function getVideo(videoID: string) {
    const snapshot = await firestore.collection(videoCollectionId).doc(videoID).get();
    return (snapshot.data() as Video) ?? {};
}

export function setVideo(videoID: string, video: Video) {
    return firestore
        .collection(videoCollectionId)
        .doc(videoID)
        .set(video, {merge: true})
}

export async function isVideoNew(videoID: string) {
    const video = await getVideo(videoID);
    return video?.status === undefined;
}