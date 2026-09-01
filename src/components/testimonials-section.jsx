import InstagramPhone from "@/components/InstagramPhone";

export function TestimonialsSection({ reviewVideos = [] }) {
	return (
		<div className="testimonialsLayout">
			<div className="testimonialsHead">
				<span className="testimonialsNum">002 / Отзывы</span>
				<h2 className="testimonialsTitle">
					<span>ОТЗЫВЫ.</span>
					<span>НАШЕ КОМЬЮНИТИ</span>
				</h2>
				<p className="testimonialsSub">
					Что говорят те, кто уже носит Липовой.
				</p>
			</div>

			<div className="testimonialsBody testimonialsBody--phoneOnly">
				<div className="testimonialsPhoneCol">
					<InstagramPhone videos={reviewVideos} username="lipovoygym.shop" />
				</div>
			</div>
		</div>
	);
}
