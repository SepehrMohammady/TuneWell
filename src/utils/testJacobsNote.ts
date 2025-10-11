// Specific test for Jacob's Note metadata extraction to match MX Player results
import { extractFromFilename, extractQualityInfo } from './advancedMetadata';

/**
 * Test the exact file from the user's screenshot
 */
export const testJacobsNoteMetadata = () => {
  console.log('🎵 TESTING JACOB\'S NOTE METADATA EXTRACTION 🎵\n');
  
  const testCases = [
    {
      filename: 'Swedish House Mafia, Jacob Mühlrad - Jacob\'s Note.flac',
      description: 'Main artist collaboration format',
      expectedArtist: 'Swedish House Mafia, Jacob Mühlrad',
      expectedTitle: 'Jacob\'s Note'
    },
    {
      filename: '03. Jacob\'s Note.flac',
      description: 'Track number format',
      expectedTrack: 3,
      expectedTitle: 'Jacob\'s Note'
    },
    {
      filename: 'Jacob\'s Note.flac', 
      description: 'Title only format',
      expectedTitle: 'Jacob\'s Note'
    },
    {
      filename: 'Swedish House Mafia - Until Now - Jacob\'s Note.flac',
      description: 'Artist - Album - Title format',
      expectedArtist: 'Swedish House Mafia',
      expectedAlbum: 'Until Now',
      expectedTitle: 'Jacob\'s Note'
    }
  ];
  
  console.log('=== JACOB\'S NOTE METADATA EXTRACTION RESULTS ===\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`Filename: "${testCase.filename}"`);
    
    const metadata = extractFromFilename(testCase.filename);
    const quality = extractQualityInfo(testCase.filename, 41943040); // ~40MB FLAC
    
    console.log(`📊 Results:`);
    console.log(`   Artist: "${metadata.artist}"`);
    console.log(`   Album:  "${metadata.album}"`);  
    console.log(`   Title:  "${metadata.title}"`);
    console.log(`   Track:  ${metadata.trackNumber || 'N/A'}`);
    console.log(`   Format: ${quality.format}`);
    console.log(`   Bitrate: ${quality.bitrate?.toLocaleString()} bps`);
    
    // Check if results match expectations
    let success = true;
    if (testCase.expectedArtist && metadata.artist !== testCase.expectedArtist) {
      console.log(`   ❌ Expected artist: "${testCase.expectedArtist}", got: "${metadata.artist}"`);
      success = false;
    }
    if (testCase.expectedTitle && metadata.title !== testCase.expectedTitle) {
      console.log(`   ❌ Expected title: "${testCase.expectedTitle}", got: "${metadata.title}"`);
      success = false;
    }
    if (testCase.expectedTrack && metadata.trackNumber !== testCase.expectedTrack) {
      console.log(`   ❌ Expected track: ${testCase.expectedTrack}, got: ${metadata.trackNumber}`);
      success = false;
    }
    
    if (success) {
      console.log(`   ✅ Extraction successful!`);
    }
    
    console.log('');
  });
  
  console.log('=== MX PLAYER COMPARISON ===');
  console.log('MX Player shows: "Swedish House Mafia,Jacob Mühlrad - Jacob\'s Note"');
  console.log('Our extraction should match this format for collaboration tracks');
  console.log('');
  
  // Test the exact format that should work
  const optimalFormat = 'Swedish House Mafia, Jacob Mühlrad - Jacob\'s Note.flac';
  const result = extractFromFilename(optimalFormat);
  
  console.log(`🎯 OPTIMAL FORMAT TEST: "${optimalFormat}"`);
  console.log(`Result: "${result.artist}" - "${result.title}"`);
  
  if (result.artist === 'Swedish House Mafia, Jacob Mühlrad' && result.title === 'Jacob\'s Note') {
    console.log('✅ SUCCESS: Extraction matches MX Player format!');
  } else {
    console.log('❌ MISMATCH: Need to adjust pattern matching');
  }
  
  return result;
};

/**
 * Test common collaboration formats for electronic music
 */
export const testCollaborationFormats = () => {
  console.log('\n🎛️ TESTING COLLABORATION FORMATS 🎛️\n');
  
  const collaborationCases = [
    'Artist1, Artist2 - Title.mp3',
    'Artist1 & Artist2 - Title.flac', 
    'Artist1 feat. Artist2 - Title.wav',
    'Artist1 ft Artist2 - Title.m4a',
    'Artist1 x Artist2 - Title.aac',
    'Artist1 vs Artist2 - Title.ogg'
  ];
  
  collaborationCases.forEach(filename => {
    const result = extractFromFilename(filename);
    console.log(`"${filename}" → "${result.artist}" - "${result.title}"`);
  });
};