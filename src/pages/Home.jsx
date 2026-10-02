import SEO from '../lib/seo.jsx'
import { websiteLd } from '../lib/structuredData.js'
import { site } from '../config/site.config.js'
import EventsBanner from '../components/EventsBanner.jsx'
import FeaturedNews from '../components/FeaturedNews.jsx'
import Stories from '../components/Stories.jsx'
import Shorts from '../components/Shorts.jsx'
import LiveNews from '../components/LiveNews.jsx'
import PokerCalendar from '../components/PokerCalendar.jsx'
import RecentChampions from '../components/RecentChampions.jsx'
import PlayersOfTheYear from '../components/PlayersOfTheYear.jsx'
import AsiaTours from '../components/AsiaTours.jsx'
import FAQ from '../components/FAQ.jsx'
import PokerRooms from '../components/PokerRooms.jsx'
import './Home.css'

export default function Home() {
  return (
    <main className="home">
      <SEO jsonLd={websiteLd()} />
      {/* The design has no visible page title; site.config's homeHeading is the
          document's h1 for crawlers and screen readers without changing the layout. */}
      <h1 className="sr-only">{site.seo.homeHeading}</h1>
      <EventsBanner />
      <div className="home__sections container">
        <FeaturedNews />
        <Stories />
        <Shorts />
        <section className="home__two-col" aria-label="Live poker news and calendar">
          <LiveNews />
          <PokerCalendar />
        </section>
        <section className="home__two-col" aria-label="Players">
          <RecentChampions />
          <PlayersOfTheYear />
        </section>
        <AsiaTours />
        <FAQ />
        <PokerRooms />
      </div>
    </main>
  )
}
