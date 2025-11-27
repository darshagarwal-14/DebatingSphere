from pathlib import Path
path = Path('frontend/src/App.js')
text = path.read_text(encoding='utf-8')
marker = '      <div className="controls">'
start = text.find(marker)
if start == -1:
    raise SystemExit('controls block not found')
idx = start
depth = 0
end = None
while idx < len(text):
    if text.startswith('<div', idx):
        depth += 1
        idx += 4
        continue
    if text.startswith('</div>', idx):
        depth -= 1
        idx += 6
        if depth == 0:
            end = idx
            break
        continue
    idx += 1
if end is None:
    raise SystemExit('end not found')
block_lines = [
    '      <div className="controls">',
    '        {currentSpeaker === \'user\' && !aiSpeaking && !debateStarted && (',
    '          <div className="instruction-message">',
    '            Press the "Record Response" button to start recording your speech.',
    '          </div>',
    '        )}',
    '        {currentSpeaker === \'user\' && !aiSpeaking && debateStarted && (',
    '          <>',
    '            <div className="turn-indicator">',
    '              <h3>Your Turn &mdash; {debateState.charAt(0).toUpperCase() + debateState.slice(1)} Speech</h3>',
    '              <p>',
    '                Round {currentRound} &middot; Time Limit: {timeLimit} minutes',
    '              </p>',
    '            </div>',
    '            <button',
    '              className={`record-button ${recording ? \'recording\' : \'\'}`}',
    '              onClick={record}',
    '              disabled={recording}',
    '            >',
    '              {recording ? (',
    '                <>',
    '                  Recording ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, \'0\')})',
    '                  <div className="audio-visualizer" aria-hidden="true">',
    '                    <div className="audio-bar"></div>',
    '                    <div className="audio-bar"></div>',
    '                    <div className="audio-bar"></div>',
    '                    <div className="audio-bar"></div>',
    '                    <div className="audio-bar"></div>',
    '                  </div>',
    '                </>',
    '              ) : (',
    '                "Record Response"',
    '              )}',
    '            </button>',
    '            <button className="stop-button" onClick={stopRecord} disabled={!recording}>',
    '              Stop &amp; Submit',
    '            </button>',
    '          </>',
    '        )}',
    '        {currentSpeaker === \'ai\' && <div className="waiting-message">AI is preparing its response...</div>}',
    '        {aiSpeaking && <div className="waiting-message">AI is speaking...</div>}',
    '      </div>'
]
new_block = '\r\n'.join([''] + block_lines) + '\r\n'
text = text[:start] + new_block + text[end:]
path.write_text(text, encoding='utf-8')
