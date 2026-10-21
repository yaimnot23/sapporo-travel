/*
 * Firebase 연결 설정 (계획 페이지의 실시간 저장용)
 *
 * 이 값들은 페이지에 공개되어도 되는 값입니다.
 * 실제로 누가 읽고 쓸 수 있는지는 Firestore 보안 규칙과 가족 암호(로그인)로 막습니다.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyCTfFOTabEhtJOzviOjJ3q2pWX4SXOR4Zk',
  authDomain: 'sapporo-travel-a2033.firebaseapp.com',
  projectId: 'sapporo-travel-a2033',
  storageBucket: 'sapporo-travel-a2033.firebasestorage.app',
  messagingSenderId: '605799710631',
  appId: '1:605799710631:web:f4a7778c492ebf444b4082',
};
