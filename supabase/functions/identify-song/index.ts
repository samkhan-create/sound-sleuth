import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting song identification...');
    
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      console.error('No audio file provided');
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessKey = Deno.env.get('ACRCLOUD_ACCESS_KEY');
    const accessSecret = Deno.env.get('ACRCLOUD_ACCESS_SECRET');
    const host = Deno.env.get('ACRCLOUD_HOST');

    if (!accessKey || !accessSecret || !host) {
      console.error('Missing ACRCloud credentials');
      return new Response(
        JSON.stringify({ error: 'ACRCloud credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare ACRCloud API request
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const dataType = 'audio';
    const signatureVersion = '1';
    
    // Create signature string
    const stringToSign = [
      'POST',
      '/v1/identify',
      accessKey,
      dataType,
      signatureVersion,
      timestamp
    ].join('\n');

    // Create HMAC-SHA1 signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(accessSecret);
    const messageData = encoder.encode(stringToSign);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );
    
    const signature = base64Encode(signatureBuffer);

    // Prepare multipart form data for ACRCloud
    const acrFormData = new FormData();
    acrFormData.append('sample', audioFile);
    acrFormData.append('access_key', accessKey);
    acrFormData.append('data_type', dataType);
    acrFormData.append('signature_version', signatureVersion);
    acrFormData.append('signature', signature);
    acrFormData.append('sample_bytes', audioFile.size.toString());
    acrFormData.append('timestamp', timestamp);

    console.log('Sending request to ACRCloud...');
    console.log('Host:', host);
    console.log('Access Key (first 4 chars):', accessKey.substring(0, 4));
    console.log('Timestamp:', timestamp);
    console.log('Sample size:', audioFile.size);
    
    // Call ACRCloud API
    const acrResponse = await fetch(`https://${host}/v1/identify`, {
      method: 'POST',
      body: acrFormData,
    });

    const result = await acrResponse.json();
    console.log('ACRCloud response:', JSON.stringify(result));

    if (result.status.code !== 0) {
      console.error('ACRCloud error:', result.status.msg);
      return new Response(
        JSON.stringify({ error: result.status.msg || 'Song not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract song data from ACRCloud response
    const music = result.metadata?.music?.[0];
    
    if (!music) {
      console.log('No music found in response');
      return new Response(
        JSON.stringify({ error: 'Song not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const songData = {
      title: music.title,
      artist: music.artists?.[0]?.name || 'Unknown Artist',
      album: music.album?.name,
      albumArt: music.album?.cover || undefined,
      releaseDate: music.release_date,
      externalUrl: music.external_metadata?.spotify?.track?.id 
        ? `https://open.spotify.com/track/${music.external_metadata.spotify.track.id}`
        : music.external_ids?.isrc 
        ? `https://www.spotify.com/search/${music.external_ids.isrc}`
        : undefined,
    };

    console.log('Successfully identified song:', songData.title);

    return new Response(
      JSON.stringify(songData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in identify-song function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to identify song';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
