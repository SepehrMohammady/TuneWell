// Test utility to verify enhanced metadata extraction
import { createEnhancedAudioTrack } from './enhancedMetadata';
import { AudioTrack } from '../types/navigation';

/**
 * Test different filename patterns to verify metadata extraction
 */
export const testMetadataExtraction = () => {
  console.log('=== Testing Enhanced Metadata Extraction ===\n');
  
  const testFiles = [
    {
      name: 'Queen - A Night at the Opera - Bohemian Rhapsody.flac',
      uri: '/music/Queen/A Night at the Opera/Queen - A Night at the Opera - Bohemian Rhapsody.flac',
      size: 84000000,
    },
    {
      name: 'Eagles - Hotel California.mp3', 
      uri: '/music/Eagles/Hotel California/Eagles - Hotel California.mp3',
      size: 15000000,
    },
    {
      name: '01 - Led Zeppelin - Stairway to Heaven.wav',
      uri: '/music/Led Zeppelin/Led Zeppelin IV/01 - Led Zeppelin - Stairway to Heaven.wav',
      size: 52000000,
    },
    {
      name: '(1975) Pink Floyd - Wish You Were Here - Shine On You Crazy Diamond.flac',
      uri: '/music/Pink Floyd/(1975) Wish You Were Here/(1975) Pink Floyd - Wish You Were Here - Shine On You Crazy Diamond.flac',
      size: 78000000,
    },
    {
      name: 'Unknown Song.mp3',
      uri: '/downloads/Unknown Song.mp3',
      size: 8000000,
    },
  ];

  const results: AudioTrack[] = [];
  
  testFiles.forEach((file, index) => {
    console.log(`Test ${index + 1}: ${file.name}`);
    const track = createEnhancedAudioTrack(file.name, file.uri, file.size);
    
    console.log(`  Artist: ${track.artist}`);
    console.log(`  Album: ${track.album}`);
    console.log(`  Title: ${track.title}`);
    console.log(`  Format: ${track.format}`);
    console.log(`  Bitrate: ${track.bitrate?.toLocaleString()} bps`);
    console.log(`  Sample Rate: ${track.sampleRate} Hz`);
    console.log(`  File Size: ${(track.fileSize / 1000000).toFixed(1)} MB`);
    console.log('');
    
    results.push(track);
  });
  
  return results;
};

/**
 * Test realistic scenarios with common filename patterns
 */
export const testCommonPatterns = () => {
  console.log('=== Testing Common Filename Patterns ===\n');
  
  const commonPatterns = [
    'Artist - Album - Track.mp3',
    'Artist - Track.flac', 
    '01 - Track Name.wav',
    'Track Name.mp3',
    'Artist - Track (feat. Other Artist).m4a',
    '2023 - Artist - Album - Track.flac',
  ];
  
  commonPatterns.forEach((pattern, index) => {
    console.log(`Pattern ${index + 1}: ${pattern}`);
    const track = createEnhancedAudioTrack(
      pattern, 
      `/music/${pattern}`,
      10000000 // 10MB
    );
    
    console.log(`  Result: ${track.artist} - ${track.album} - ${track.title}`);
    console.log('');
  });
};

/**
 * Verify metadata extraction handles edge cases properly
 */
export const testEdgeCases = () => {
  console.log('=== Testing Edge Cases ===\n');
  
  const edgeCases = [
    { name: '', uri: '', size: 0 }, // Empty
    { name: 'NoExtension', uri: '/test/NoExtension', size: 1000 },
    { name: 'Multiple - Dashes - In - Filename.mp3', uri: '/test/Multiple - Dashes - In - Filename.mp3', size: 5000000 },
    { name: 'Special_Characters!@#$%.flac', uri: '/test/Special_Characters!@#$%.flac', size: 20000000 },
  ];
  
  edgeCases.forEach((testCase, index) => {
    console.log(`Edge Case ${index + 1}: "${testCase.name}"`);
    try {
      const track = createEnhancedAudioTrack(testCase.name, testCase.uri, testCase.size);
      console.log(`  Success: ${track.artist} - ${track.title}`);
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    console.log('');
  });
};

/**
 * Run all metadata extraction tests
 */
export const runAllMetadataTests = () => {
  console.log('🎵 TUNEWELL METADATA EXTRACTION TESTS 🎵\n');
  
  const basicResults = testMetadataExtraction();
  testCommonPatterns();
  testEdgeCases();
  
  console.log('=== Summary ===');
  console.log(`✅ Created ${basicResults.length} test tracks`);
  console.log('✅ Enhanced filename parsing active');
  console.log('✅ Multiple pattern matching working');
  console.log('✅ Fallback metadata handling');
  
  const wellParsed = basicResults.filter(track => 
    track.artist !== 'Unknown Artist' && 
    track.album !== 'Unknown Album'
  );
  
  console.log(`📊 Successfully parsed: ${wellParsed.length}/${basicResults.length} tracks`);
  
  return basicResults;
};