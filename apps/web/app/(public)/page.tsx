import HomeInteractions from '../components/home/HomeInteractions';
import HomeContent from '../components/home/HomeContent';
import { StructuredData } from '../components/landing/StructuredData';
import '../components/home/home.css';

export default function HomePage() {
  return (
    <>
      <StructuredData includePlanOffer={false} />
      <HomeInteractions>
        <HomeContent />
      </HomeInteractions>
    </>
  );
}
