import React from 'react';
import { PublicKey } from '@solana/web3.js';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { GRAY, REACT_GRAY, PURPLE, WHITE, DARK_GRAY } from '../../constants';

import { hexToRGB } from '../../utils';

import Button from '../Button';
import { ConnectedMethods } from '../../App';

require('@solana/wallet-adapter-react-ui/styles.css');

// =============================================================================
// Styled Components
// =============================================================================

const Main = styled.main`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  align-items: center;
  background-color: ${REACT_GRAY};
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  max-height: 100vh;
  > * {
    margin-bottom: 10px;
  }
  @media (max-width: 768px) {
    width: 100%;
    height: auto;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  button {
    margin-bottom: 15px;
  }
`;

const Link = styled.a.attrs({
  href: 'https://phantom.app/',
  target: '_blank',
  rel: 'noopener noreferrer',
})`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-decoration: none;
  margin-bottom: 30px;
  padding: 5px;
  &:focus-visible {
    outline: 2px solid ${hexToRGB(GRAY, 0.5)};
    border-radius: 6px;
  }
`;

const Pre = styled.pre`
  margin-bottom: 5px;
`;

const Badge = styled.div`
  margin: 0;
  padding: 10px;
  width: 100%;
  color: ${PURPLE};
  background-color: ${hexToRGB(PURPLE, 0.2)};
  font-size: 14px;
  border-radius: 6px;
  @media (max-width: 400px) {
    width: 280px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 320px) {
    width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ::selection {
    color: ${WHITE};
    background-color: ${hexToRGB(PURPLE, 0.5)};
  }
  ::-moz-selection {
    color: ${WHITE};
    background-color: ${hexToRGB(PURPLE, 0.5)};
  }
`;

const Divider = styled.div`
  border: 1px solid ${DARK_GRAY};
  height: 1px;
  margin: 20px 0;
`;

const Tag = styled.p`
  text-align: center;
  color: ${GRAY};
  a {
    color: ${PURPLE};
    text-decoration: none;
    ::selection {
      color: ${WHITE};
      background-color: ${hexToRGB(PURPLE, 0.5)};
    }
    ::-moz-selection {
      color: ${WHITE};
      background-color: ${hexToRGB(PURPLE, 0.5)};
    }
  }
  @media (max-width: 320px) {
    font-size: 14px;
  }
  ::selection {
    color: ${WHITE};
    background-color: ${hexToRGB(PURPLE, 0.5)};
  }
  ::-moz-selection {
    color: ${WHITE};
    background-color: ${hexToRGB(PURPLE, 0.5)};
  }
`;

const NavigationLink = styled(NavLink)`
  display: block;
  color: ${GRAY};
  text-decoration: none;
  margin-bottom: 5px;
  font-size: 14px;
  padding: 8px;
  width: 100%;
  background-color: ${hexToRGB(PURPLE, 0.2)};
  border-radius: 6px;
  box-sizing: border-box;
  text-align: center;

  &.active {
    font-weight: bold;
    color: ${PURPLE};
  }

  &:hover {
    color: ${PURPLE};
  }
`;

const MenuButton = styled.button`
  margin-bottom: 10px;
  padding: 8px 12px;
  width: 200px;
  background-color: ${PURPLE};
  color: ${WHITE};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background-color: ${hexToRGB(PURPLE, 0.8)};
  }
`;

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  width: 200px;
`;

const Menu = styled.div``;

// =============================================================================
// Typedefs
// =============================================================================

interface Props {
  publicKey?: PublicKey;
  connectedMethods: ConnectedMethods[];
  connect: () => Promise<void>;
}

// =============================================================================
// Main Component
// =============================================================================

const Sidebar = React.memo((props: Props) => {
  const { publicKey, connectedMethods } = props;
  const [menuOpen, setMenuOpen] = React.useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <Main>
      <Body>
        <Link>
          <img src="/images/phantom-icon-purple.png" alt="Phantom" width="75" />
        </Link>
        <WalletMultiButton />  
        {publicKey ? (
          // connected
          <>
            <div>
              <Pre>Connected as</Pre>
              <Badge>{publicKey.toBase58()}</Badge>
              <Divider />
            </div>
            {connectedMethods.map((method, i) => (
              <Button key={`${method.name}-${i}`} onClick={method.onClick}>
                {method.name}
              </Button>
            ))}
          </>
        ) : (
          // not connected
          <></>
        )}
      </Body>
      {/* 😊 💕  */}
      <Tag>
        Made with{' '}
        <span role="img" aria-label="Red Heart Emoji">
          ❤️
        </span>{' '}
        by the <a href="https://phantom.app">Phantom</a> team
      </Tag>
    </Main>
  );
});

export default Sidebar;
