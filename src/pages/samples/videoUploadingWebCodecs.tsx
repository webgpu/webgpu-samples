import Head from 'next/head';

function Page(): JSX.Element {
  return (
    <Head>
      <meta
        httpEquiv="refresh"
        content={`0; url=${BASE_PATH}/samples/videoUploading?videoSource=videoFrame`}
      ></meta>
    </Head>
  );
}

export default Page;
