import React from 'react';

type TokenGroup = {
  title: string;
  tokens: { name: string; value: string; cssVar?: string }[];
};

interface TokenDisplayProps {
  groups: TokenGroup[];
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({ groups }) => {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.title} className="space-y-4">
          <h2 className="text-xl font-semibold">{group.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.tokens.map((token) => (
              <div
                key={token.name}
                className="border rounded-lg p-4 flex flex-col space-y-2"
              >
                {token.value.startsWith('#') || token.value.startsWith('hsl') ? (
                  <div
                    className="h-16 rounded-md mb-2"
                    style={{ backgroundColor: token.value }}
                  />
                ) : token.name.includes('font') ? (
                  <div className="h-16 flex items-center">
                    <span style={{ fontFamily: token.value }}>
                      The quick brown fox jumps over the lazy dog
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center">
                  <span className="font-medium">{token.name}</span>
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                    {token.cssVar || token.value}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TokenDisplay;